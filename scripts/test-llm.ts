/**
 * One live call against whichever provider LLM_PROVIDER selects, to prove the
 * adapter, JSON mode, schema validation and cost accounting all work before any
 * pipeline stage depends on them.
 *
 * When the provider is DeepSeek it also issues a raw call to confirm thinking
 * mode is genuinely disabled — on the v4 models it defaults to on at high
 * effort, which would slow every stage and bill extra output tokens.
 *
 * Run: npm run test-llm
 */
import OpenAI from "openai";
import { z } from "zod";
import { completeJSON, getProvider } from "../lib/llm";
import { DEEPSEEK_BASE_URL, DEEPSEEK_MODEL } from "../lib/llm/deepseek";

const Extraction = z.object({
  project_type: z.string(),
  budget_signal: z.string(),
  urgency: z.enum(["low", "medium", "high"]),
});

const NOTE =
  "site walk 3/12 w/ Marcus. pergola over north patio + built-in grill run. " +
  "budget confirmed 40-45k, no pushback. kitchen reno ran 6 wks long, said " +
  "call me when that's done. no objections on scope or price — purely timing.";

async function checkThinkingDisabled() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return;

  const client = new OpenAI({ apiKey, baseURL: DEEPSEEK_BASE_URL });
  const params = {
    model: DEEPSEEK_MODEL,
    messages: [{ role: "user", content: "Reply with the json {\"ok\":true}." }],
    response_format: { type: "json_object" },
    thinking: { type: "disabled" },
  };

  const res = await client.chat.completions.create(
    params as unknown as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
  );

  const message = res.choices[0]?.message as
    | { reasoning_content?: string | null }
    | undefined;
  const reasoning = message?.reasoning_content;
  const details = res.usage?.completion_tokens_details as
    | { reasoning_tokens?: number }
    | undefined;
  const reasoningTokens = details?.reasoning_tokens ?? 0;

  console.log("\nThinking mode check (DeepSeek):");
  console.log(`  reasoning_content : ${reasoning ? `${reasoning.length} chars` : "absent"}`);
  console.log(`  reasoning_tokens  : ${reasoningTokens}`);
  console.log(
    `  verdict           : ${!reasoning && reasoningTokens === 0 ? "DISABLED as intended" : "STILL ENABLED — investigate"}`,
  );
}

async function main() {
  const provider = getProvider();
  console.log(`Provider: ${provider.name} / ${provider.model}`);

  const started = Date.now();
  const result = await completeJSON({
    system:
      "You extract structured facts from a contractor's messy CRM notes. " +
      "Use only what the note states. Do not infer a budget that is not written.",
    user: `Extract from this note:\n\n${NOTE}`,
    schema: Extraction,
    temperature: 0.2,
  });
  const elapsed = Date.now() - started;

  console.log("\nParsed and schema-validated output:");
  console.log(JSON.stringify(result.data, null, 2));
  console.log("\nAccounting:");
  console.log(`  input tokens  : ${result.usage.inputTokens}`);
  console.log(`  output tokens : ${result.usage.outputTokens}`);
  console.log(`  cost estimate : $${result.costEstimate.toFixed(6)}`);
  console.log(`  latency       : ${elapsed}ms`);

  if (provider.name === "deepseek") await checkThinkingDisabled();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
