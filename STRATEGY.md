# Strategy — Greenscape Pro Reactivation Agent

> Sections marked **TODO (yours)** are strategy content that has to come from you.
> Everything else is written from what the build actually does.

---

## TODO (yours) — The five agents

_The five agents you'd build for Greenscape Pro, ranked, with the reasoning for
the ordering. The reactivation agent in this repo is the P0 of that set._

## TODO (yours) — "De-Marcus the workflow"

_The thesis: which parts of Marcus's judgement are actually encodable, which are
not, and where the boundary sits._

## TODO (yours) — Reflective answers

_Both reflective questions from the brief._

## TODO (yours) — The notes-contradiction catch

_The observation about contradictions in the lead notes._

---

## Architecture decisions

### Why Supabase rather than a hosted CRM stand-in

There is no live GoHighLevel access for this build, so something had to hold the
lead records. Supabase gives real Postgres with constraints that encode the
domain — the `loss_reason`, `tier`, `status`, `sentiment` and `intent` columns
all carry CHECK constraints, so an invalid state cannot be written even by a bug.
Row-level security is enabled with zero policies on every table, which means the
publishable key can read nothing at all; the service-role key bypasses RLS and is
the only key the app ever uses for data access, server-side.

In production this layer is GoHighLevel's API. The pipeline does not care: it
reads a lead record and writes a scored, drafted, verified result.

### Why a single repo rather than the two-repo split

The reference pattern splits a Vercel frontend from a Railway worker so
long-running background jobs can scale independently. Nothing here is
long-running. Sends are triggered by a human clicking approve, and the batch
routes finish in under a minute. A second host would add deployment surface and
an inter-service contract to maintain, in exchange for scaling that nothing
currently needs.

The moment that changes is the first genuinely asynchronous piece of work — a
scheduled drip sequence, or polling for inbound replies. At that point the
pipeline moves behind a queue and the split earns its keep.

### Why Gemini is the documented default and DeepSeek is the dev provider

The client is US-based and the records contain customer PII. DeepSeek is a
Chinese provider, and US clients push back on that for data-residency reasons —
this client raised it themselves. So the documented default for production is a
US provider, and `LLM_PROVIDER` defaults to `gemini`.

DeepSeek earns its place during development for a different reason: Gemini's free
tier allows 10 requests per minute and 250 per day. A full run over the seeded
data is about 102 calls, so a day of iteration would hit the ceiling in two
passes. DeepSeek has the headroom to iterate on prompts quickly and costs
fractions of a cent to do it.

The provider layer exists so this is a one-variable decision rather than a
rewrite. Three adapters sit behind one interface; JSON parsing, schema
validation, cost accounting and throttling all live above them, so behaviour is
identical whichever is selected.

### Why the throttle has two mechanisms

Reactive backoff alone is not enough on a 10 RPM tier. A batch fires its first
calls simultaneously, they all get throttled together, and their retries then
collide again. So there are two: exponential backoff (1s, 2s, 4s, 8s) for what
has already gone wrong, and a process-wide 6.5-second pacer that spaces Gemini
calls before it goes wrong. The pacer is a no-op for providers with headroom, so
DeepSeek stays fully concurrent.

### Why tier is computed rather than asked for

The first scoring prompt gave the model tier bands and asked for both a tier and
a score. It picked a tier and then emitted a round number inside that band —
15 leads landed on exactly 60 and 9 on exactly 30, which makes ranking a queue
by score meaningless. Replacing that with an additive rubric of specific weights,
plus an explicit instruction not to round, spread 34 leads across 12 distinct
scores from 17 to 84. Tier is now derived from the score in code, so a lead's
tier can never contradict its own score in the database.

---

## Guardrails, and what happens when the model returns garbage

Three independent layers, because they fail in different ways.

**Schema.** Every model output is zod-validated. The zod schema is also rendered
to JSON Schema and included in the prompt, so the shape being asked for and the
shape being validated against cannot drift apart. A parse or validation failure
retries once with a stricter instruction; token usage accumulates across both
attempts so a retry's cost is not dropped from the total.

**Deterministic content rules.** The draft must use the lead's first name and
reference the actual project. It must not contain a price, a percentage, or terms
like discount, free, guarantee or price match. It must not commit to a specific
calendar date. It must contain exactly one call to action and stay under a word
cap. These need no model to detect and are checked on every draft regardless of
what the verifier concluded.

**The grounding pass.** A separate call that sees the lead record and the draft,
and lists any claim the record does not support. A model that lists unsupported
claims while also setting `passed: true` has contradicted itself — the claims win.

Anything caught by either the verifier or a content rule is held in the queue as
"needs manual review", shown in red with the specific reason. It is never
auto-approved and never silently dropped.

### The false positives were the interesting part

Both layers initially over-fired, and a review queue that cries wolf trains the
reviewer to ignore it — which is strictly worse than not flagging at all.

The content check matched substrings, so "**free**standing ramada" and "the
budget would **free** up" were both flagged as offering something at no cost. It
now matches words, with "free up" and "feel free" excluded. "discount" is
deliberately still flagged even in an honest negation like "I don't have a
discount to offer": unlike "freestanding", that sentence genuinely is about
discounting, and it earns a human glance before going out.

The verifier was failing good drafts over phrases like "about 16 months since we
walked your yard", on leads where the record supported exactly that. The fault
was ours: it had been handed a raw ISO timestamp and asked to do date arithmetic
against a "today" it has no reliable knowledge of. It now receives the same
pre-computed month count the drafter got. It was also flagging Marcus's own
statements of intent — "that project is still one I'd like to build" — as
unsupported claims, when those describe the sender and have nothing in the record
to contradict.

After both fixes: 34 drafts, zero failures, three held on deterministic rules,
and no verifier false positives.

### Proving the verifier can actually fail

Because the drafting prompt is strict, the model does not take the bait on the
trap leads. It writes honest lines like "I don't have a discount to offer" and
"we couldn't commit to a finish date then" — so the verifier correctly passes
everything in a normal run, and its ability to fail is never exercised.

That is the right product behaviour and the wrong demonstration. So
`npm run test-verifier` exercises it deliberately, feeding fabricated drafts
built against those same lead records: an invented off-season discount, a
committed completion date, an unoffered competitor price match. It catches all
three, quotes the offending phrases, and exits non-zero if any gets through.

---

## Cost and model reasoning

`cost_estimate` is persisted per message from a per-provider rate table
(`lib/llm/pricing.ts`), verified against each vendor's published pricing. The
dashboard reports cost per action by model, where one action is a drafted message
— a generation call plus its grounding check. Scoring is billed separately and is
excluded, and the dashboard says so rather than showing an unlabelled number.

| | Input / 1M | Output / 1M |
|---|---|---|
| gemini-2.5-flash (free tier) | $0 | $0 |
| gemini-2.5-flash (paid) | $0.30 | $2.50 |
| deepseek-v4-flash | $0.44 | $1.32 |
| gpt-5-mini | $0.20 | $1.20 |

Measured on the seeded data: a full 34-lead draft-and-verify run on
`deepseek-v4-flash` cost **$0.029**, about **$0.00085 per drafted message**. On
Gemini's free tier the same run costs **$0**.

Scaling that to the real book of ~1,400 closed-lost leads: after a pre-filter
that removes roughly a third, about 950 leads would go through the pipeline for
somewhere near **$0.80** on DeepSeek, or free on Gemini until the daily request
cap forces batching across days. Even at Gemini's paid rate the figure is a
rounding error against a single booked pergola. The cost that matters in this
system is human review time, not inference — which is exactly why the guardrails
exist to keep the review queue short and its flags trustworthy.

---

## Documented assumptions

- **No live GHL access**, so Supabase stands in. Production reads and writes GHL
  through its API; the pipeline is indifferent to which is behind it.
- **Synthetic leads**, so the free-tier data-training caveat is moot here.
  Production would use a paid or US-resident tier with real customer PII.
- **Replies are simulated.** There is no inbound email parsing in this build. The
  classification, storage and revenue attribution downstream are real; only the
  ingestion is mocked.
- **Demo email delivery is redirected.** Seeded leads have synthetic addresses
  that would bounce, so every send goes to `DEMO_REDIRECT_EMAIL` while the UI
  still shows the lead's true address.
- **Resend sandbox sender.** This deployment sends from `onboarding@resend.dev`
  with no custom domain and no DNS verification. Production sends from the
  client's own verified domain directly to the lead. `.env.example` is reproduced
  byte-for-byte from spec §10 and therefore shows the production shape, not the
  values in use — see the README for the difference.
- **An unsubscribe is honoured immediately.** A reply classified as `unsubscribe`
  sets `opt_out`, and the pre-filter excludes that lead from every future run.
