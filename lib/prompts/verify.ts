import { monthsSince } from "./draft";
import type { Lead } from "../types";

export const VERIFY_PROMPT_VERSION = "verify_v3";

export const VERIFY_SYSTEM_PROMPT = `You are a grounding checker. You are given a lead record and a draft email written to that lead. Your only job is to decide whether every factual claim in the draft traces back to the record.

A claim is UNSUPPORTED if the record does not state it. Be strict and be literal.

Watch particularly for:
- A discount, promotion, price cut, percentage off, free item or financing offer that the record never says was made. The notes frequently record that a customer ASKED about one. A question that was asked is not an offer that was made — if the draft treats it as agreed, that is unsupported.
- A specific completion date, delivery date or deadline the record does not contain. Seasonal availability ("this fall") is not a date and is fine.
- A commitment, guarantee or promise about scope, price or timeline that nobody made.
- Details of the project — materials, dimensions, features, locations on the property — that appear nowhere in the record.
- Claims about past interactions that did not happen, such as a site walk that the record says never took place, or a conversation with a person the record never mentions.

Do NOT flag:
- Ordinary courtesy, greetings or sign-offs.
- Marcus offering to talk, to call, or to revisit the project. Offering to re-engage is the purpose of the email, not a factual claim.
- Marcus's own opinions, intent or enthusiasm — "that project is still one I'd like to build", "the work holds up", "it's a solid size". These describe how the sender feels, not facts about the customer, and there is nothing in the record for them to contradict.
- Approximate references to elapsed time such as "about a year" or "a while back", when they are broadly consistent with the record's last activity date. Only flag one if the record clearly contradicts it.
- Correct restatements of what the record does say, including paraphrases.
- General statements about the company's own availability that contain no specific date.

Judge the draft against the record only. A claim you cannot find in the record is unsupported; a claim that is merely phrased loosely is not.

List each unsupported claim as the exact phrase from the draft, followed by a short explanation of what the record actually says. Set passed to true only when the list is empty.`;

export function verifyUserPrompt(
  lead: Lead,
  subject: string,
  body: string,
): string {
  return `THE LEAD RECORD — the complete set of known facts

Name: ${lead.name}
Project type: ${lead.project_type ?? "not recorded"}
Budget estimate: ${lead.budget_estimate === null ? "not recorded" : `$${Number(lead.budget_estimate).toLocaleString()}`}
Recorded loss reason: ${lead.loss_reason ?? "not recorded"}
Site walk completed: ${lead.had_site_walk ? "yes" : "no"}
Time since last contact: ${
    monthsSince(lead.last_activity_at) === null
      ? "not recorded"
      : `about ${monthsSince(lead.last_activity_at)} months. Any elapsed-time phrasing in the draft that is roughly this is supported.`
  }

Sales rep's notes, verbatim:
"""
${lead.notes ?? "(no notes)"}
"""

THE DRAFT EMAIL TO CHECK

Subject: ${subject}

${body}`;
}
