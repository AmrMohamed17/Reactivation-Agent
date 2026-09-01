import { NextResponse } from "next/server";
import { BATCH_CONCURRENCY, completeJSON, mapWithConcurrency } from "@/lib/llm";
import { prefilter } from "@/lib/prefilter";
import {
  ANALYZE_SYSTEM_PROMPT,
  analyzeUserPrompt,
} from "@/lib/prompts/analyze";
import { AnalysisSchema, tierForScore } from "@/lib/schemas";
import { getSupabase } from "@/lib/supabase";
import type { Lead } from "@/lib/types";

export const maxDuration = 300;

type Body = {
  /** Re-analyse leads that already carry a score. */
  force?: boolean;
  /** Cap how many leads are sent to the model, to protect a daily quota. */
  limit?: number;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const force = body.force === true;
  const limit =
    typeof body.limit === "number" && body.limit > 0 ? body.limit : undefined;

  const supabase = getSupabase();
  const { data, error } = await supabase.from("leads").select("*");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const leads = (data ?? []) as Lead[];

  // 1. Deterministic pre-filter over every lead, before any model call.
  const dropped = new Map<string, string[]>();
  const eligible: Lead[] = [];

  for (const lead of leads) {
    const verdict = prefilter(lead);
    if (verdict.eligible) {
      eligible.push(lead);
      continue;
    }
    const reason = verdict.reason ?? "ineligible";
    dropped.set(reason, [...(dropped.get(reason) ?? []), lead.id]);
  }

  for (const [reason, ids] of dropped) {
    const { error: dropError } = await supabase
      .from("leads")
      .update({
        eligible: false,
        tier: null,
        score: null,
        // No model ran for these, so score_reason carries the pre-filter's
        // rationale instead. Prefixed so the queue can tell them apart.
        score_reason: `Pre-filter: ${reason}`,
        scoring_model: null,
      })
      .in("id", ids);
    if (dropError) {
      return NextResponse.json({ error: dropError.message }, { status: 500 });
    }
  }

  if (eligible.length > 0) {
    const { error: eligibleError } = await supabase
      .from("leads")
      .update({ eligible: true })
      .in(
        "id",
        eligible.map((l) => l.id),
      );
    if (eligibleError) {
      return NextResponse.json({ error: eligibleError.message }, { status: 500 });
    }
  }

  // 2. Analyse the survivors, throttled.
  let queue = force ? eligible : eligible.filter((l) => l.score === null);
  if (limit !== undefined) queue = queue.slice(0, limit);

  const results = await mapWithConcurrency(
    queue,
    BATCH_CONCURRENCY,
    async (lead) => {
      try {
        const analysis = await completeJSON({
          system: ANALYZE_SYSTEM_PROMPT,
          user: analyzeUserPrompt(lead),
          schema: AnalysisSchema,
          temperature: 0.2,
        });

        const { extraction, scoring } = analysis.data;
        // The model is asked for a tier as well, but the score is the thing it
        // reasoned about; deriving the tier here means the two can never
        // disagree in the database.
        const tier = tierForScore(scoring.score);

        const { error: updateError } = await supabase
          .from("leads")
          .update({
            extracted: extraction,
            tier,
            score: scoring.score,
            score_reason: scoring.reason,
            scoring_model: `${analysis.provider}/${analysis.model}`,
          })
          .eq("id", lead.id);
        if (updateError) throw new Error(updateError.message);

        return {
          id: lead.id,
          name: lead.name,
          ok: true as const,
          tier,
          score: scoring.score,
          cost: analysis.costEstimate,
        };
      } catch (err) {
        return {
          id: lead.id,
          name: lead.name,
          ok: false as const,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    },
  );

  const analysed = results.filter((r) => r.ok).length;

  return NextResponse.json({
    total_leads: leads.length,
    dropped_by_prefilter: leads.length - eligible.length,
    drop_reasons: Object.fromEntries(
      [...dropped].map(([reason, ids]) => [reason, ids.length]),
    ),
    eligible: eligible.length,
    analysed,
    failed: results.length - analysed,
    total_cost: results.reduce((sum, r) => sum + (r.ok ? r.cost : 0), 0),
    results,
  });
}
