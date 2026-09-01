import { needsManualReview } from "./guardrails";
import { getSupabase } from "./supabase";

export type ModelCost = {
  model: string;
  /** Messages attributed to this model. */
  actions: number;
  total: number;
  per_action: number;
};

export type Metrics = {
  funnel: {
    total_leads: number;
    eligible: number;
    drafted: number;
    approved: number;
    sent: number;
    replied: number;
    booked: number;
    attributed_revenue: number;
  };
  leads_by_tier: Record<string, number>;
  needs_review: number;
  cost: { total: number; by_model: ModelCost[] };
  replies: {
    sentiment: Record<string, number>;
    intent: Record<string, number>;
  };
};

function tally(values: (string | null)[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const value of values) {
    if (!value) continue;
    out[value] = (out[value] ?? 0) + 1;
  }
  return out;
}

export async function getMetrics(): Promise<Metrics> {
  const supabase = getSupabase();

  const [leadsRes, messagesRes, repliesRes] = await Promise.all([
    supabase.from("leads").select("id,eligible,tier"),
    supabase
      .from("messages")
      .select("status,cost_estimate,model,verifier_passed,guardrail_flags"),
    supabase.from("replies").select("lead_id,booked,booked_value,sentiment,intent"),
  ]);

  const firstError = leadsRes.error ?? messagesRes.error ?? repliesRes.error;
  if (firstError) throw new Error(firstError.message);

  const leads = leadsRes.data ?? [];
  const messages = messagesRes.data ?? [];
  const replies = repliesRes.data ?? [];

  const sent = messages.filter((m) => m.status === "sent").length;
  // A sent message was necessarily approved first, so it still counts here.
  const approved = messages.filter(
    (m) => m.status === "approved" || m.status === "sent",
  ).length;

  const byModel = new Map<string, { actions: number; total: number }>();
  for (const message of messages) {
    const key = (message.model as string | null) ?? "unknown";
    const entry = byModel.get(key) ?? { actions: 0, total: 0 };
    entry.actions += 1;
    entry.total += Number(message.cost_estimate ?? 0);
    byModel.set(key, entry);
  }

  return {
    funnel: {
      total_leads: leads.length,
      eligible: leads.filter((l) => l.eligible === true).length,
      drafted: messages.length,
      approved,
      sent,
      replied: new Set(replies.map((r) => r.lead_id as string)).size,
      booked: replies.filter((r) => r.booked).length,
      attributed_revenue: replies.reduce(
        (sum, r) => sum + Number(r.booked_value ?? 0),
        0,
      ),
    },
    leads_by_tier: tally(leads.map((l) => l.tier as string | null)),
    needs_review: messages.filter((m) =>
      needsManualReview({
        verifier_passed: m.verifier_passed as boolean | null,
        guardrail_flags: m.guardrail_flags as string[] | null,
      }),
    ).length,
    cost: {
      total: messages.reduce((sum, m) => sum + Number(m.cost_estimate ?? 0), 0),
      by_model: [...byModel].map(([model, { actions, total }]) => ({
        model,
        actions,
        total,
        per_action: actions > 0 ? total / actions : 0,
      })),
    },
    replies: {
      sentiment: tally(replies.map((r) => r.sentiment as string | null)),
      intent: tally(replies.map((r) => r.intent as string | null)),
    },
  };
}
