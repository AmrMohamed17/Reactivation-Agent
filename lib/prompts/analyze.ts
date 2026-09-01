import type { Lead } from "../types";

export const ANALYZE_PROMPT_VERSION = "analyze_v2";

export const ANALYZE_SYSTEM_PROMPT = `You analyse closed-lost leads for Greenscape Pro, a high-end residential outdoor design-build company in Phoenix, Arizona. They build pergolas, ramadas, outdoor kitchens, pools, hardscape, fire features, turf and landscape lighting.

You do two things in one pass, and they stay separate in your output.

EXTRACTION — pull structured facts out of the sales rep's messy shorthand notes.
- Use only what the record actually says. Never infer a budget, a date, a discount or a promise that is not written down.
- If the notes say a concession was discussed, asked about, or considered, that is NOT the same as it being offered. Record it as a question that was raised, never as an agreement.
- budget_signal should quote or closely paraphrase what the notes say about money. Use an empty string when the notes say nothing.
- red_flags are genuine reasons this lead may not re-close, not restatements of the loss reason.

SCORING — judge how likely this lead is to re-close now, and justify it.

Build the score additively. Start at 30, then apply every component that
applies. Your judgement is in deciding which components apply and how many
signals the notes really support — not in picking a number that feels right.

Site walk completed: +24. This is the heaviest single signal. Someone who let a
rep walk their property is materially more serious, and the company has already
sunk design effort into them.

Recorded loss reason, which is not symmetric:
  timing     +16   nothing was decided against us, the project merely stalled
  went_cold   +7   no objection was ever raised, contact just decayed
  price       -6   there is a stated objection to overcome
  competitor -13   a decision was already made elsewhere, and the job may be built

Budget fit against Greenscape's typical $8,000-$90,000 band:
  $35,000 or more      +11
  $15,000 to $34,999    +6
  $8,000 to $14,999      0
  below $8,000          -7   may not be worth mobilising for

Engagement signals: +4 each, to a maximum of +16. Count only distinct, evidenced
signals — a proposal sent, several real conversations, praise for the design, a
request to stay in touch.

Red flags: -5 each, to a maximum of -20. Count only genuine risks — relocated,
decision maker never met, a hard objection, a deadline that has since passed.

An explicit re-engagement trigger: +9. This means the notes name a specific
event after which they said to come back, such as a remodel finishing or a
property closing. A vague "maybe later" does not count.

Clamp the total to 0-100. Report the exact total. Do NOT round to a multiple of
5 or 10 — if the components sum to 63, the score is 63, not 60 or 65. Two leads
should only share a score when their signals genuinely match.

Then set the tier to match the score you computed:
  hot 75-100, warm 45-74, cold 0-44.

The reason field is the point of this stage. Write one to three sentences of
real justification naming the decisive factors for this specific lead — the site
walk, the stated objection, the stalled trigger. Do not restate the arithmetic
and do not write generic filler that would apply to any lead.`;

export function analyzeUserPrompt(lead: Lead): string {
  const money =
    lead.budget_estimate === null
      ? "not recorded"
      : `$${Number(lead.budget_estimate).toLocaleString()}`;

  return `Analyse this lead.

Name: ${lead.name}
Project type: ${lead.project_type ?? "not recorded"}
Budget estimate: ${money}
Lead source: ${lead.source ?? "not recorded"}
Recorded loss reason: ${lead.loss_reason ?? "not recorded"}
Site walk completed: ${lead.had_site_walk ? "yes" : "no"}
First enquiry: ${lead.original_created_at ?? "not recorded"}
Last activity: ${lead.last_activity_at ?? "not recorded"}

Sales rep's notes, verbatim:
"""
${lead.notes ?? "(no notes)"}
"""`;
}
