import type { Lead } from "./types";

/**
 * Greenscape Pro's real project floor is around $8k. This threshold sits
 * deliberately below it: it exists to drop tire-kickers, not to qualify leads.
 * An $8k-$15k lead stays eligible and is judged on its merits by the scoring
 * stage, where budget fit is a weight rather than a gate.
 */
export const MIN_BUDGET = 5000;

export type PrefilterVerdict = {
  eligible: boolean;
  /** Why the lead was dropped. Null when eligible. */
  reason: string | null;
};

/**
 * Deterministic, runs before any LLM call. Four hard drops only — everything
 * else is a judgement call and belongs to the model.
 */
export function prefilter(lead: Lead): PrefilterVerdict {
  if (lead.opt_out) {
    return { eligible: false, reason: "opted out of contact" };
  }
  if (lead.loss_reason === "unqualified") {
    return { eligible: false, reason: "marked unqualified at intake" };
  }
  if (!lead.email) {
    return { eligible: false, reason: "no email address on file" };
  }
  if (lead.budget_estimate === null || lead.budget_estimate < MIN_BUDGET) {
    return {
      eligible: false,
      reason: `budget below the $${MIN_BUDGET.toLocaleString()} floor`,
    };
  }
  return { eligible: true, reason: null };
}
