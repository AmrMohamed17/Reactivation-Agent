import { GoogleGenAI } from "@google/genai";
import type { LLMProvider } from "./types";

export const GEMINI_MODEL = "gemini-2.5-flash";

/**
 * Free tier is 10 RPM / 250 RPD, so calls are spaced just over 6s apart.
 * See pace() in withRetry.ts.
 */
export const GEMINI_MIN_INTERVAL_MS = 6500;

export function createGeminiProvider(): LLMProvider {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set.");

  const ai = new GoogleGenAI({ apiKey });

  return {
    name: "gemini",
    model: GEMINI_MODEL,
    async complete({ system, user, temperature }) {
      const res = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: user,
        config: {
          systemInstruction: system,
          temperature: temperature ?? 0.4,
          responseMimeType: "application/json",
        },
      });

      const usage = res.usageMetadata;
      return {
        text: res.text ?? "",
        model: GEMINI_MODEL,
        usage: {
          inputTokens: usage?.promptTokenCount ?? 0,
          // Thinking tokens are billed as output, so they belong in the same
          // bucket for cost purposes.
          outputTokens:
            (usage?.candidatesTokenCount ?? 0) + (usage?.thoughtsTokenCount ?? 0),
        },
      };
    },
  };
}
