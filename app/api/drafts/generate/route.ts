import { NextResponse } from "next/server";
import { checkGuardrails } from "@/lib/guardrails";
import { BATCH_CONCURRENCY, completeJSON, mapWithConcurrency } from "@/lib/llm";
import {
  DRAFT_PROMPT_VERSION,
  DRAFT_SYSTEM_PROMPT,
  draftUserPrompt,
} from "@/lib/prompts/draft";
import {
  VERIFY_PROMPT_VERSION,
  VERIFY_SYSTEM_PROMPT,
  verifyUserPrompt,
} from "@/lib/prompts/verify";
import { DraftSchema, VerificationSchema, type Extraction } from "@/lib/schemas";
import { getSupabase } from "@/lib/supabase";
import type { Lead, Tier } from "@/lib/types";

export const maxDuration = 300;

type Body = {
  lead_ids?: string[];
  tier?: Tier;
  limit?: number;
  /** Draft again even for leads that already have a live message. */
  force?: boolean;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const supabase = getSupabase();

  let query = supabase
    .from("leads")
    .select("*")
    .eq("eligible", true)
    .not("score", "is", null)
    .order("score", { ascending: false });

  if (body.lead_ids?.length) query = query.in("id", body.lead_ids);
  if (body.tier) query = query.eq("tier", body.tier);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  let leads = (data ?? []) as Lead[];

  // Don't stack a second draft on a lead that already has a live one.
  if (!body.force && leads.length > 0) {
    const { data: existing, error: existingError } = await supabase
      .from("messages")
      .select("lead_id,status")
      .in(
        "lead_id",
        leads.map((l) => l.id),
      );
    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }
    const live = new Set(
      (existing ?? [])
        .filter((m) => m.status !== "rejected" && m.status !== "failed")
        .map((m) => m.lead_id as string),
    );
    leads = leads.filter((l) => !live.has(l.id));
  }

  if (typeof body.limit === "number" && body.limit > 0) {
    leads = leads.slice(0, body.limit);
  }

  const results = await mapWithConcurrency(leads, BATCH_CONCURRENCY, async (lead) => {
    try {
      const extraction = (lead.extracted as Extraction | null) ?? null;

      // Stage 3 — draft.
      const draft = await completeJSON({
        system: DRAFT_SYSTEM_PROMPT,
        user: draftUserPrompt(lead, extraction),
        schema: DraftSchema,
        temperature: 0.7,
      });

      // Stage 4 — grounding pass, a separate call that sees the record and the
      // draft but nothing about how the draft was produced.
      const verification = await completeJSON({
        system: VERIFY_SYSTEM_PROMPT,
        user: verifyUserPrompt(lead, draft.data.subject, draft.data.body),
        schema: VerificationSchema,
        temperature: 0,
      });

      // A model that lists unsupported claims while setting passed=true has
      // contradicted itself; the claims win.
      const verifierPassed =
        verification.data.passed &&
        verification.data.unsupported_claims.length === 0;

      const verifierNotes =
        verification.data.unsupported_claims.length > 0
          ? verification.data.unsupported_claims.join("\n")
          : verification.data.notes || null;

      const flags = checkGuardrails({
        subject: draft.data.subject,
        body: draft.data.body,
        lead,
        extraction,
      });

      const cost = draft.costEstimate + verification.costEstimate;

      const { error: insertError } = await supabase.from("messages").insert({
        lead_id: lead.id,
        channel: "email",
        draft_subject: draft.data.subject,
        draft_body: draft.data.body,
        status: "drafted",
        model: `${draft.provider}/${draft.model}`,
        prompt_version: `${DRAFT_PROMPT_VERSION}+${VERIFY_PROMPT_VERSION}`,
        cost_estimate: cost,
        guardrail_flags: flags,
        verifier_passed: verifierPassed,
        verifier_notes: verifierNotes,
      });
      if (insertError) throw new Error(insertError.message);

      return {
        id: lead.id,
        name: lead.name,
        ok: true as const,
        verifier_passed: verifierPassed,
        guardrail_flags: flags,
        needs_review: !verifierPassed || flags.length > 0,
        cost,
      };
    } catch (err) {
      return {
        id: lead.id,
        name: lead.name,
        ok: false as const,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });

  const drafted = results.filter((r) => r.ok).length;
  const flagged = results.filter((r) => r.ok && r.needs_review).length;

  return NextResponse.json({
    considered: leads.length,
    drafted,
    flagged_for_review: flagged,
    failed: results.length - drafted,
    total_cost: results.reduce((sum, r) => sum + (r.ok ? r.cost : 0), 0),
    results,
  });
}
