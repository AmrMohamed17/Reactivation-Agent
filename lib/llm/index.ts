import { z, type ZodType } from "zod";
import { createDeepSeekProvider } from "./deepseek";
import { GEMINI_MIN_INTERVAL_MS, createGeminiProvider } from "./gemini";
import { createOpenAIProvider } from "./openai";
import { estimateCost } from "./pricing";
import type { LLMProvider, ProviderName, TokenUsage } from "./types";
import { pace, withRetry } from "./withRetry";

export type { LLMProvider, ProviderName, TokenUsage } from "./types";
export { mapWithConcurrency, withRetry } from "./withRetry";
export { estimateCost, PRICING, PAID_REFERENCE } from "./pricing";

/** Concurrency for batch pipeline work, per ARCHITECTURE.md §6. */
export const BATCH_CONCURRENCY = 2;

let cached: { name: ProviderName; provider: LLMProvider } | null = null;

export function getProvider(): LLMProvider {
  const name = (process.env.LLM_PROVIDER ?? "gemini") as ProviderName;
  if (cached?.name === name) return cached.provider;

  const provider =
    name === "deepseek"
      ? createDeepSeekProvider()
      : name === "openai"
        ? createOpenAIProvider()
        : name === "gemini"
          ? createGeminiProvider()
          : (() => {
              throw new Error(
                `Unknown LLM_PROVIDER "${name}". Expected gemini, deepseek or openai.`,
              );
            })();

  cached = { name, provider };
  return provider;
}

export type JsonResult<T> = {
  data: T;
  usage: TokenUsage;
  costEstimate: number;
  model: string;
  provider: ProviderName;
};

/**
 * DeepSeek's JSON mode requires the word "json" to appear in the prompt, and
 * every stage of this pipeline wants a bare object regardless of provider.
 */
const JSON_INSTRUCTION =
  "Respond with a single valid JSON object and nothing else.";

const STRICTER_INSTRUCTION =
  "Your previous response could not be parsed. Return ONLY a single valid JSON " +
  "object matching the requested shape exactly. No prose, no markdown code fences.";

/** Models occasionally wrap JSON in a code fence even in JSON mode. */
function unfence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1] : trimmed;
}

/**
 * Calls the active provider and returns schema-validated JSON.
 *
 * The zod schema is rendered to JSON Schema and included in the prompt, so the
 * shape the model is asked for and the shape it is validated against cannot
 * drift apart. Callers describe intent; they never restate field names.
 *
 * On a parse or validation failure it retries exactly once with a stricter
 * instruction, per ARCHITECTURE.md §6. Token usage is accumulated across both
 * attempts so a retry's cost is not silently dropped from the total.
 */
export async function completeJSON<T>({
  system,
  user,
  schema,
  temperature,
}: {
  system: string;
  user: string;
  schema: ZodType<T>;
  temperature?: number;
}): Promise<JsonResult<T>> {
  const provider = getProvider();
  const minInterval = provider.name === "gemini" ? GEMINI_MIN_INTERVAL_MS : 0;

  const shape = `The JSON object must conform to this JSON Schema:\n${JSON.stringify(
    z.toJSONSchema(schema),
  )}`;

  const total: TokenUsage = { inputTokens: 0, outputTokens: 0 };
  let lastProblem = "";

  for (let attempt = 0; attempt < 2; attempt++) {
    const systemPrompt = [
      system,
      JSON_INSTRUCTION,
      shape,
      attempt > 0 ? STRICTER_INSTRUCTION : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    await pace(minInterval);
    const raw = await withRetry(() =>
      provider.complete({ system: systemPrompt, user, temperature }),
    );

    total.inputTokens += raw.usage.inputTokens;
    total.outputTokens += raw.usage.outputTokens;

    let candidate: unknown;
    try {
      candidate = JSON.parse(unfence(raw.text));
    } catch {
      lastProblem = `not valid JSON (received ${raw.text.slice(0, 200) || "an empty response"})`;
      continue;
    }

    const parsed = schema.safeParse(candidate);
    if (parsed.success) {
      return {
        data: parsed.data,
        usage: total,
        costEstimate: estimateCost(raw.model, total),
        model: raw.model,
        provider: provider.name,
      };
    }

    lastProblem = `did not match the schema (${parsed.error.issues
      .map((i) => `${i.path.join(".") || "root"}: ${i.message}`)
      .join("; ")})`;
  }

  throw new Error(
    `${provider.name}/${provider.model} returned output that ${lastProblem}, including after a stricter retry.`,
  );
}
