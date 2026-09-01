export type ProviderName = "gemini" | "deepseek" | "openai";

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
};

export type CompleteArgs = {
  system: string;
  user: string;
  temperature?: number;
};

export type RawCompletion = {
  text: string;
  usage: TokenUsage;
  model: string;
};

/**
 * The single interface every adapter implements. Adapters deal only in raw
 * text plus token counts; JSON parsing, schema validation, cost and throttling
 * all live one level up in lib/llm/index.ts so they behave identically
 * regardless of which provider is selected.
 */
export interface LLMProvider {
  readonly name: ProviderName;
  readonly model: string;
  complete(args: CompleteArgs): Promise<RawCompletion>;
}
