import type { Lead } from "../types";

export const CLASSIFY_PROMPT_VERSION = "classify_v1";

export const CLASSIFY_SYSTEM_PROMPT = `You classify a customer's reply to a re-engagement email from Greenscape Pro, an outdoor design-build company.

Return a sentiment and an intent.

sentiment describes the tone:
- positive: pleased, warm, or enthusiastic
- neutral: matter-of-fact, asking logistics, neither warm nor cold
- negative: annoyed, dismissive, or unhappy

intent describes what they want to happen next:
- interested: wants to move forward, restart, or meet
- question: needs information before deciding, and has not said no
- not_interested: declines this project or says the work is already done
- unsubscribe: asks to stop being contacted at all

Judge intent by what they ask for, not by tone. A blunt "just send me the number" is neutral or negative in sentiment but is still a question. A warm "thanks so much, we already built it with someone else" is positive in sentiment but not_interested. Only use unsubscribe when they actually ask to stop hearing from the company, not merely to decline this one project.`;

export function classifyUserPrompt(lead: Lead, replyBody: string): string {
  return `The lead is ${lead.name}, who previously discussed a ${lead.project_type ?? "project"} and went quiet (recorded reason: ${lead.loss_reason ?? "not recorded"}).

Classify their reply:
"""
${replyBody}
"""`;
}
