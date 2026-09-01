import { z } from "zod";

/** Stage 1 — structured extraction from messy free-text notes. */
export const ExtractionSchema = z.object({
  scope_signals: z
    .array(z.string())
    .describe("Concrete work the lead wants, quoted or paraphrased from notes"),
  budget_signal: z
    .string()
    .describe("What the notes say about budget. Empty string if nothing stated"),
  loss_reason_confirmed: z
    .boolean()
    .describe("Whether the notes corroborate the recorded loss_reason"),
  engagement_signals: z
    .array(z.string())
    .describe("Evidence of buying interest, e.g. site walk done, proposal sent"),
  red_flags: z
    .array(z.string())
    .describe("Reasons this lead may not re-close"),
});

/** Stage 2 — reasoned prioritisation built on the extraction. */
export const ScoringSchema = z.object({
  tier: z.enum(["hot", "warm", "cold"]),
  score: z.int().min(0).max(100),
  reason: z
    .string()
    .describe("Written justification referencing this lead's specifics"),
});

/**
 * Stages 1 and 2 are issued as a single call to conserve Gemini's free-tier
 * request budget, as ARCHITECTURE.md §5 permits, but stay distinct sections of
 * the response.
 */
export const AnalysisSchema = z.object({
  extraction: ExtractionSchema,
  scoring: ScoringSchema,
});

/**
 * The tier bands the scoring prompt is given. Applied in code after the call so
 * a lead's tier can never contradict its own score, whatever the model returns.
 */
export function tierForScore(score: number): "hot" | "warm" | "cold" {
  if (score >= 75) return "hot";
  if (score >= 45) return "warm";
  return "cold";
}

export type Extraction = z.infer<typeof ExtractionSchema>;
export type Scoring = z.infer<typeof ScoringSchema>;
export type Analysis = z.infer<typeof AnalysisSchema>;
