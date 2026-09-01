import type { Extraction } from "../schemas";
import type { Lead } from "../types";

export const DRAFT_PROMPT_VERSION = "draft_v1";

/** Body length cap, enforced deterministically in lib/guardrails.ts. */
export const MAX_BODY_WORDS = 120;

const ANGLES: Record<string, string> = {
  timing:
    "Their timeline has probably shifted since you last spoke. Acknowledge the thing that was holding them up, and note that the schedule has openings. Speak in seasons, never in specific dates.",
  competitor:
    "They went elsewhere, or were leaning that way. Do not pretend otherwise and do not compete on price. Ask, genuinely, how the project turned out or what they decided. The goal is an honest check-in, and the future work it might lead to.",
  went_cold:
    "Nothing went wrong — contact simply decayed. Re-open softly by referencing the specific project you discussed, so it is obvious this is a real person who remembers them and not a blast.",
  price:
    "Price was the objection. Re-open on value and fit, not on cost. You may not invent a discount, a promotion, a price cut or a financing offer, and you may not hint that one might exist. If nothing about the price has changed, the honest angle is the project itself.",
};

export const DRAFT_SYSTEM_PROMPT = `You write short re-engagement emails as Marcus, who runs Greenscape Pro, a high-end residential outdoor design-build company in Phoenix, Arizona.

VOICE
Marcus is a builder, not a marketer. Short sentences. Direct and warm without being chummy. He remembers the specific project and says so. He does not use exclamation marks, and he does not use marketing adjectives like stunning, transform, elevate, dream or oasis. He signs off simply as Marcus.

HARD CONSTRAINTS — these are not style preferences
1. Use only facts present in the lead record you are given. If a fact is not in the record, it does not go in the email.
2. Never invent or imply a price, a discount, a promotion, a percentage off, a free item, a guarantee, or a financing offer.
3. Never commit to a specific calendar date or a completion deadline. Seasonal language is fine — "this fall", "before it heats up". A date like "March 3rd" or "the 15th" is not.
4. The notes may record that a customer ASKED about a discount, a price match or a completion date. A question that was asked is not a thing that was agreed. Never write as though it was offered, promised or approved.
5. Exactly one call to action, phrased as a single question. Not two asks, not a question plus a nudge.
6. Body of ${MAX_BODY_WORDS} words or fewer.
7. Use the lead's first name, and reference their actual project.

Write a subject line and a body. The subject should read like a person wrote it to one recipient, not like a campaign.`;

/**
 * Whole months since a timestamp. Shared with the verifier so it checks an
 * elapsed-time claim against the same number the drafter was given, rather than
 * doing date arithmetic against a "today" it has no reliable knowledge of.
 */
export function monthsSince(timestamp: string | null): number | null {
  if (!timestamp) return null;
  return Math.max(
    1,
    Math.round(
      (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60 * 24 * 30),
    ),
  );
}

export function draftUserPrompt(lead: Lead, extraction: Extraction | null): string {
  const firstName = lead.name.split(" ")[0];
  const angle =
    ANGLES[lead.loss_reason ?? ""] ??
    "Re-open softly by referencing the specific project you discussed.";

  const months = monthsSince(lead.last_activity_at);

  const facts = [
    `First name: ${firstName}`,
    `Project discussed: ${lead.project_type ?? "not recorded"}`,
    `Site walk completed: ${lead.had_site_walk ? "yes" : "no"}`,
    `Why it stalled (recorded): ${lead.loss_reason ?? "not recorded"}`,
    months ? `Last contact: about ${months} months ago` : null,
    extraction?.scope_signals.length
      ? `Scope details from the notes: ${extraction.scope_signals.join("; ")}`
      : null,
    extraction?.engagement_signals.length
      ? `Engagement history: ${extraction.engagement_signals.join("; ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `Write the re-engagement email for this lead.

THE ANGLE FOR THIS LEAD
${angle}

THE LEAD RECORD — the complete set of facts you may draw on
${facts}

The sales rep's original notes, for context on what was actually discussed. Read these carefully for what was agreed versus what was merely raised:
"""
${lead.notes ?? "(no notes)"}
"""`;
}
