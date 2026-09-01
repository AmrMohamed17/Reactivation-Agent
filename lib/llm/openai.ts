import OpenAI from "openai";
import type { LLMProvider } from "./types";

/** Optional adapter — ARCHITECTURE.md §2 leaves the model unspecified. */
export const OPENAI_MODEL = "gpt-5-mini";

export function createOpenAIProvider(): LLMProvider {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set.");

  const client = new OpenAI({ apiKey });

  return {
    name: "openai",
    model: OPENAI_MODEL,
    async complete({ system, user }) {
      // temperature is deliberately omitted: the GPT-5 family rejects it on
      // some models, and determinism here comes from the prompt and schema.
      const res = await client.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      });

      return {
        text: res.choices[0]?.message?.content ?? "",
        model: OPENAI_MODEL,
        usage: {
          inputTokens: res.usage?.prompt_tokens ?? 0,
          outputTokens: res.usage?.completion_tokens ?? 0,
        },
      };
    },
  };
}
