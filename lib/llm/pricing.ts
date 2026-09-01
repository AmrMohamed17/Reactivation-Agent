import type { TokenUsage } from "./types";

export type Rate = {
  /** USD per 1M input tokens. */
  input: number;
  /** USD per 1M output tokens (Gemini bills thinking tokens as output). */
  output: number;
};

/**
 * Billable rates, keyed by model id. Verified against each vendor's public
 * pricing page on 2026-09-01.
 *
 * gemini-2.5-flash is zero because the free tier is genuinely free rather than
 * merely cheap — that is the reason it is the documented default for this
 * client. PAID_REFERENCE below records what the same traffic would cost once
 * volume forces a move to the paid tier, which is the number that matters when
 * projecting 1,400 leads rather than 50.
 */
export const PRICING: Record<string, Rate> = {
  "gemini-2.5-flash": { input: 0, output: 0 },
  // DeepSeek publishes an off-peak/peak band; the peak rate is used so cost is
  // never understated.
  "deepseek-v4-flash": { input: 0.44, output: 1.32 },
  "deepseek-v4-pro": { input: 1.32, output: 3.96 },
  "gpt-5-mini": { input: 0.2, output: 1.2 },
};

/** What Gemini would cost on the paid tier, for projection in STRATEGY.md. */
export const PAID_REFERENCE: Record<string, Rate> = {
  "gemini-2.5-flash": { input: 0.3, output: 2.5 },
};

export function estimateCost(model: string, usage: TokenUsage): number {
  const rate = PRICING[model];
  if (!rate) return 0;
  return (
    (usage.inputTokens / 1_000_000) * rate.input +
    (usage.outputTokens / 1_000_000) * rate.output
  );
}
