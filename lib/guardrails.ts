import { MAX_BODY_WORDS } from "./prompts/draft";
import type { Extraction } from "./schemas";
import type { Lead } from "./types";

/**
 * Deterministic content rules, run on every draft regardless of what the
 * verifier says. These catch the mechanical failures — a banned token, a hard
 * date, a runaway length — that do not need a model to detect.
 *
 * Nothing here rejects a draft. A tripped rule populates guardrail_flags and
 * routes the message to manual review in the queue.
 */

/**
 * The §6 gate: a draft is held for a human either because the grounding pass
 * failed or because a deterministic rule tripped. Never silently dropped.
 */
export function needsManualReview(message: {
  verifier_passed: boolean | null;
  guardrail_flags: string[] | null;
}): boolean {
  return message.verifier_passed === false || (message.guardrail_flags?.length ?? 0) > 0;
}

/**
 * Matched as words rather than substrings. A naive substring test flagged
 * "freestanding ramada" and "the budget would free up" as offers of something
 * at no cost, which is the kind of false positive that teaches a reviewer to
 * ignore the flags.
 *
 * "discount" is deliberately still flagged even in an honest negation such as
 * "I don't have a discount to offer". Unlike "freestanding", that sentence is
 * genuinely about discounting, and an email from a company that does not
 * discount earns a human glance before it goes out.
 */
const BANNED_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\bdiscount(s|ed|ing)?\b/i, label: "discount" },
  { pattern: /(?<!feel\s)\bfree\b(?!\s+up)/i, label: "free" },
  { pattern: /\bguarantee(s|d|ing)?\b/i, label: "guarantee" },
  { pattern: /\bpromotion(s|al)?\b/i, label: "promotion" },
  { pattern: /\bprice[- ]match(ing|es)?\b/i, label: "price match" },
  { pattern: /\bno charge\b/i, label: "no charge" },
];

/**
 * Blocks a specific calendar date while allowing the seasonal language the
 * drafting strategy for `timing` leads explicitly calls for. ARCHITECTURE.md
 * §6 bans "specific calendar dates" but §5 wants "we have fall availability",
 * so the line is drawn at day-level precision: months and seasons pass,
 * month-plus-day, ordinals and numeric dates do not.
 */
const DATE_PATTERNS: { pattern: RegExp; label: string }[] = [
  {
    pattern:
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}\b/i,
    label: "a specific calendar date",
  },
  {
    pattern: /\b\d{1,2}(st|nd|rd|th)\b/i,
    label: "a specific day of the month",
  },
  {
    pattern: /\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/,
    label: "a numeric date",
  },
];

export function checkGuardrails({
  subject,
  body,
  lead,
  extraction,
}: {
  subject: string;
  body: string;
  lead: Lead;
  extraction: Extraction | null;
}): string[] {
  const flags: string[] = [];
  const text = `${subject}\n${body}`;
  const lower = text.toLowerCase();

  const firstName = lead.name.split(" ")[0];
  if (!lower.includes(firstName.toLowerCase())) {
    flags.push(`Does not address the lead by first name (${firstName})`);
  }

  // Must ground itself in the actual project: either the recorded project type
  // or one of the scope signals pulled out of the notes.
  const anchors = [
    ...(lead.project_type ?? "").split(/[^a-z]+/i),
    ...(extraction?.scope_signals ?? []).flatMap((s) => s.split(/[^a-z]+/i)),
  ]
    .map((w) => w.toLowerCase())
    .filter((w) => w.length > 3);

  if (anchors.length > 0 && !anchors.some((a) => lower.includes(a))) {
    flags.push("Does not reference the project type or any scope signal");
  }

  if (text.includes("$")) {
    flags.push("Contains a price or dollar figure");
  }
  if (/\d\s*%|\bpercent\b/i.test(text)) {
    flags.push("Contains a percentage");
  }

  for (const { pattern, label } of BANNED_PATTERNS) {
    if (pattern.test(text)) {
      flags.push(`Contains a prohibited term ("${label}")`);
    }
  }

  for (const { pattern, label } of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      flags.push(`Commits to ${label} ("${match[0].trim()}")`);
      break;
    }
  }

  // A single ask, per §6. More than one question mark is the cheap proxy for
  // more than one call to action.
  const questions = (body.match(/\?/g) ?? []).length;
  if (questions > 1) {
    flags.push(`Contains ${questions} questions, so more than one call to action`);
  }

  const words = body.trim().split(/\s+/).filter(Boolean).length;
  if (words > MAX_BODY_WORDS) {
    flags.push(`Body is ${words} words, over the ${MAX_BODY_WORDS}-word cap`);
  }

  return flags;
}
