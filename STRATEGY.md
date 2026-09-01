# Strategy — Greenscape Pro Reactivation Agent

## The five agents

Ranked by return net of build effort and risk, not by raw problem size. The
reactivation agent in this repo is the P0.

**1. Closed-Lost Reactivation Agent** *(built here)*
Turns the ~1,400 dead leads into booked jobs with personalized, owner-voiced
outreach a human approves before it sends.
- Reads each closed-lost record, scores re-close likelihood, drafts in Marcus's
  voice with the angle set by loss reason, verifies against the record, queues for
  approval.
- Replaces Brittany's occasional untargeted re-engagement blasts and the manual
  work of personalizing at volume, which is why it never happens systematically.
- ROI: ~1,400 leads at a conservative 2% re-close × $28k avg ≈ **$784k** latent
  revenue; CAC already sunk. Even a fraction of that dwarfs the build cost.
- Why #1: highest expected value per unit of risk. The leads are already paid for,
  it changes nothing about how Marcus sells, every send is human-approved so the
  downside is capped, and it ships genuinely end-to-end in a week — the fastest
  path to *proven* revenue, which earns trust for the riskier builds behind it.

**2. Quote Accelerator**
Compresses the 6–9 day site-walk-to-proposal cycle that loses 35–40% of qualified
leads to faster competitors.
- Turns Marcus's site-walk notes into a structured scope, prices it against the
  200-line pricing sheet, produces a draft proposal for him to edit and send.
- Replaces the manual scope-interpretation and line-item assembly Marcus does on
  every proposal personally.
- ROI: highest raw revenue at risk in the business — recovering even a third of
  the lost 35–40% is worth well into six figures a year.
- Why not #1: its core — turning site-walk judgment plus a 200-line pricing model
  into a proposal Marcus *trusts* — is exactly what he says nobody else can do. A
  quote agent that misprices actively loses money, so it's a multi-week,
  higher-risk build. Bigger ceiling, wrong thing to ship first.

**3. Post-Sign Chaser**
Clears the 4–6 week post-signing limbo (HOA, permits, deposits) that ties up cash
and stalls crew scheduling.
- Watches each signed project's stage and fires the right nudge — deposit
  reminders to the customer, HOA/permit follow-ups — escalating only real stalls
  to Jenna.
- Replaces Jenna's manual chasing across 8–12 projects in limbo at any time.
- ROI: 8–12 projects × $28k = **$224k–$336k** in delayed revenue accelerated, plus
  recovered crew-scheduling time (idle crews compound).

**4. Small-Approvals Assistant**
Answers the 5–10 daily Slack pings from Jenna ("customer wants X, what do I
charge?") using Marcus's codified decision framework.
- Recommends an action and price with a confidence score, auto-clears routine
  calls, escalates only genuinely ambiguous ones to Marcus.
- Replaces Marcus as the bottleneck on routine operational decisions — the thing
  he most wants off his plate ("I want my evenings back").
- ROI: hard to price — it buys back Marcus's attention rather than direct revenue,
  and it can't be ground-truthed until his rules exist (today they're in his
  head). Highest *emotional* value, softest dollar figure — see the thesis below
  for why it's the deepest idea but not the P0.

**5. Build-Phase Update Agent**
Sends Marcus-branded progress updates to customers mid-build, triggered by
CompanyCam photos or Jobber milestones.
- Auto-drafts a short update on each milestone; scales the referral-driving Loom
  habit from ~30% of jobs to ~100%.
- Replaces the inconsistent, ad-hoc updates that leave customers calling Jenna
  every 4–5 days asking what's happening.
- ROI: real but diffuse — fewer anxiety calls, more referrals — the smallest and
  least-attributable dollar figure of the five. Last because of that, and because
  it reuses the reactivation agent's exact "context → owner-voice → approve → send"
  spine, so it's cheapest to add once #1 exists.

## The thesis: de-Marcus the workflow

Greenscape's constraint isn't five separate problems — it's one. Every revenue
path routes through Marcus. He interprets every site walk, prices every proposal,
approves every small decision, and is the only one who can re-engage a lead in a
voice that works. He is the single point of failure, and the ranking above is one
argument applied five times: each agent is scored by how much Marcus-dependency it
removes, or how much already-paid-for revenue it captures that he has no bandwidth
to reach.

That framing also draws the boundary the agents have to respect — what's encodable
versus what isn't:

- **Genuinely his, leave it:** the site walk itself. It closes at 70%+ versus ~20%
  for phone quotes. That's a real competitive advantage rooted in his physical
  presence and read of a customer; automating it would destroy value, not create
  it. No agent touches it.
- **Encodable with acceptable risk, ship now:** re-engaging dead leads in his
  voice. The judgment is bounded — it's grounded in facts already in the record,
  and a human approves every message — so the failure mode is small and reversible.
  That's the P0.
- **Encodable but high-risk, ship later:** interpreting site-walk notes into a
  priced proposal. This *is* encodable, but it depends on pricing logic and scope
  judgment that live only in his head, and the cost of getting it wrong is a
  mispriced job. Worth doing (#2), not worth doing first or fast.
- **Encodable only after he externalizes it:** the small-approvals framework. It
  can't be automated until the rules exist, and today they don't — "I keep saying
  I'll write it down, I never do." The agent's real first job there is to *extract*
  the framework, not apply one. That dependency is why it's #4, not the P0.

The reactivation agent is the right first cut because it removes a Marcus
dependency at the point where his judgment is most encodable and the risk of being
wrong is lowest.

## Reflective answers

**Why is your #1 not the founder's stated #1?**

Marcus's stated #1 is quoting speed, and he's right that it's the biggest *problem*
— it's #2 here, not off the list. But "biggest problem" and "best first build" are
different questions. The first agent should have the best return net of risk, so it
proves the model works before touching his pricing logic. Reactivation wins on that
axis: the leads are already paid for (sunk CAC, pure upside), it changes nothing
about how he sells, every send is human-approved so the downside is capped, and it
ships end-to-end in a week. The quote accelerator has a higher ceiling but its value
is locked behind the one thing Marcus says nobody else can do — interpreting his
notes and pricing them right — and a quote agent that misprices actively loses
money. So reactivation first: fastest path to proven revenue, and it earns the trust
to go build the harder thing next.

**One agent you considered and did not include, and why not.**

A **crew upsell-coaching agent** — the in-pocket assistant Marcus explicitly asked
for, that tells a crew lead how to price an on-site add-on. It's real money (~1
missed upsell per crew per week × 4 crews × ~$500 ≈ **$104k/year**) and it's his
stated #3. It's cut because it's an order of magnitude below the revenue plays *and*
it's the riskiest to land: its value depends on changing crew behavior in the field
in the moment, which is an adoption problem no model solves, and the leakage it
targets is a fraction of what the quote cycle and the dead-lead pile are losing. It
becomes worth building once the revenue engine is de-Marcus'd and the constraint
moves to margin protection — phase two, not top five. (The marketing/content agent
Marcus listed #4 is cut harder: he admitted on the call that lead volume isn't his
constraint, so it solves a non-problem.)

## The notes-contradiction catch

The two source documents disagree on the small-approvals flow. The onboarding form
says Jenna receives "5–10 Slack pings *from Marcus* per day"; the discovery
transcript has Marcus saying "Jenna pings *me* 5–10 times a day." The transcript
direction is the operative one — the whole point is that her routine decisions
require his sign-off, which is what makes the Small-Approvals Assistant (#4) a
Marcus-dependency to remove rather than a task to hand Jenna. Flagging it because
founder-submitted intake data isn't ground truth: it's how the founder *remembers*
the business, and where a form and a live account diverge, the account with
specifics usually wins. Treating the intake as gospel would have inverted who the
bottleneck is.
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
