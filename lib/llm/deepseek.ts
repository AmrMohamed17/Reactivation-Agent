import OpenAI from "openai";
import type { LLMProvider } from "./types";

/**
 * DeepSeek retired the `deepseek-chat` and `deepseek-reasoner` model names on
 * 2026-07-24; requests using them now error rather than falling back. v4-flash
 * is the cheap, fast tier — the right analog for the dev-iteration role
 * ARCHITECTURE.md §2 assigns to DeepSeek.
 */
export const DEEPSEEK_MODEL = "deepseek-v4-flash";
export const DEEPSEEK_BASE_URL = "https://api.deepseek.com";

export function createDeepSeekProvider(): LLMProvider {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY is not set.");

  const client = new OpenAI({ apiKey, baseURL: DEEPSEEK_BASE_URL });

  return {
    name: "deepseek",
    model: DEEPSEEK_MODEL,
    async complete({ system, user, temperature }) {
      const params = {
        model: DEEPSEEK_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: temperature ?? 0.4,
        response_format: { type: "json_object" },
        // Thinking is on by default at high effort on the v4 models, which is
        // slower and bills extra output tokens for no benefit on extraction and
        // classification work. reasoning_effort cannot switch it off — this is
        // the only control. Not part of the OpenAI schema, so it is forwarded
        // as an extra body key.
        thinking: { type: "disabled" },
      };

      const res = await client.chat.completions.create(
        params as unknown as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
      );

      return {
        text: res.choices[0]?.message?.content ?? "",
        model: DEEPSEEK_MODEL,
        usage: {
          inputTokens: res.usage?.prompt_tokens ?? 0,
          outputTokens: res.usage?.completion_tokens ?? 0,
        },
      };
    },
  };
}
