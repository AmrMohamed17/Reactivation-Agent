/**
 * Adversarial test for the stage 4 grounding verifier.
 *
 * The drafting prompt is strict enough that the model does not actually take
 * the bait on the trap leads — it writes honest lines like "I don't have a
 * discount to offer". That is the right product behaviour, but it means the
 * verifier passes everything in a normal run and its ability to FAIL is never
 * exercised.
 *
 * This feeds it deliberately fabricated drafts built against those same real
 * lead records: a discount that was only ever asked about, a completion date
 * that was never confirmed, and a competitor price match that was never
 * offered. Each must be caught.
 *
 * Run: npm run test-verifier
 */
import { completeJSON } from "../lib/llm";
import { VERIFY_SYSTEM_PROMPT, verifyUserPrompt } from "../lib/prompts/verify";
import { VerificationSchema } from "../lib/schemas";
import { getSupabase } from "../lib/supabase";
import type { Lead } from "../lib/types";

const CASES = [
  {
    lead: "Grant Whitfield",
    label: "invents the off-season discount he only ever ASKED about",
    subject: "Your outdoor kitchen — off-season pricing is confirmed",
    body: `Grant,

Good news. I checked with the team like I promised, and we can do the off-season pricing we discussed — 15% off the outdoor kitchen if you book before the end of the month. That brings it to around $32,000.

We can start on March 3rd and guarantee completion in six weeks.

Shall I hold that slot?

Marcus`,
  },
  {
    lead: "Priya Raman",
    label: "invents the completion date that was never confirmed",
    subject: "Your pool deck — locked in for the grad party",
    body: `Hi Priya,

I know the grad party deadline mattered. I've spoken to the crew and we can absolutely commit to having the pool deck and shade structure finished by May 15th, well before the party.

Want me to put it on the schedule?

Marcus`,
  },
  {
    lead: "Curtis Nolan",
    label: "invents the competitor price match that was never offered",
    subject: "We'll match Desert Ridge",
    body: `Curtis,

I talked it over with the team and we've decided to match the Desert Ridge number on your ramada and fireplace. Same scope, same price, and we'll throw in the landscape lighting free of charge.

Ready to move forward?

Marcus`,
  },
];

async function main() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .in(
      "name",
      CASES.map((c) => c.lead),
    );
  if (error) throw new Error(error.message);
  const leads = (data ?? []) as Lead[];

  let missed = 0;

  for (const testCase of CASES) {
    const lead = leads.find((l) => l.name === testCase.lead);
    if (!lead) {
      console.log(`SKIP ${testCase.lead}: not in the database — run npm run seed`);
      continue;
    }

    const res = await completeJSON({
      system: VERIFY_SYSTEM_PROMPT,
      user: verifyUserPrompt(lead, testCase.subject, testCase.body),
      schema: VerificationSchema,
      temperature: 0,
    });

    const caught =
      !res.data.passed || res.data.unsupported_claims.length > 0;
    if (!caught) missed++;

    console.log("=".repeat(68));
    console.log(`${testCase.lead} — ${testCase.label}`);
    console.log(
      `VERDICT: ${caught ? "CAUGHT" : "*** MISSED ***"}  (verifier_passed=${res.data.passed})`,
    );
    for (const claim of res.data.unsupported_claims) {
      console.log(`  - ${claim}`);
    }
  }

  console.log("=".repeat(68));
  if (missed > 0) {
    console.error(`${missed} fabricated draft(s) got through the verifier.`);
    process.exit(1);
  }
  console.log("All fabricated drafts were caught.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
