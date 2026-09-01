# Greenscape Pro — Reactivation Agent

Turns closed-lost leads into booked jobs by scoring them, drafting a personalised
re-engagement email in the owner's voice, checking that email against the record
it came from, and putting a human in front of every send.

Built to the spec in [ARCHITECTURE.md](./ARCHITECTURE.md). Design reasoning is in
[STRATEGY.md](./STRATEGY.md).

**Live:** https://reactivation-agent-one.vercel.app — gated by a passcode (`APP_PASSCODE`).

---

## What it actually does

A **4-stage pipeline** (extract → score → draft → verify), plus a **separate
reply-classification call** on the inbound side. The reply classifier is a real
fifth model call; it is deliberately not counted as one of the four stages.

1. **Pre-filter** (deterministic, no model). Drops opted-out leads, leads marked
   unqualified at intake, leads with no email, and budgets under a $5,000 floor.
   On the seeded data that removes 16 of 50.
2. **Extract + score** (one call, as §5 permits). Pulls scope, budget, engagement
   and red-flag signals out of messy rep shorthand, then scores 0–100 with a
   written justification. Tier is derived from the score in code so the two can
   never disagree.
3. **Draft.** Writes in Marcus's voice, with the re-engagement angle switching on
   `loss_reason` — a `timing` lead gets acknowledgement that their schedule moved,
   a `competitor` lead gets an honest "how did it turn out", a `price` lead gets
   value rather than an invented discount.
4. **Verify.** A separate call that sees the lead record and the draft and lists
   any claim in the draft the record does not support.

A draft that fails the grounding check, or trips a deterministic content rule, is
held in the queue as **needs manual review** — never auto-approved, never dropped.

## The human-in-the-loop gate

`POST /api/messages/[id]/send` re-reads status from the database and returns
**400 unless the message is `approved`**. Nothing the caller sends is trusted.
That is what makes a publicly reachable URL safe to leave wired to a live email
provider. Sending an unapproved message is refused; the whole app additionally
sits behind a passcode.

## Setup

```bash
npm install
cp .env.example .env.local     # then fill it in
```

1. **Supabase** — create a project, open the SQL editor, and run
   [`supabase/schema.sql`](./supabase/schema.sql). It is re-runnable. Copy the
   project URL and the **service-role** key into `.env.local`.
2. **Resend** — an API key. See the sending note below.
3. **Slack** — an incoming webhook URL.
4. **LLM** — a Gemini API key (free tier) and/or a DeepSeek key.
5. Seed and run:

```bash
npm run seed          # ~50 synthetic leads
npm run dev
```

Then, logged in, drive the pipeline:

```bash
curl -X POST localhost:3000/api/score            -b cookies.txt -d '{}'
curl -X POST localhost:3000/api/drafts/generate  -b cookies.txt -d '{}'
```

`/api/score` and `/api/drafts/generate` both accept `{"limit": n}` to cap how
many leads go to the model, and `{"force": true}` to redo work already done.

### Scripts

| Command | Does |
|---|---|
| `npm run seed` | Reseeds ~50 leads. Cascades, so it clears messages and replies too. |
| `npm run test-llm` | One live call against the active provider; prints tokens and cost. |
| `npm run test-verifier` | Feeds the verifier deliberately fabricated drafts. Exits non-zero if any gets through. |

## Email sending, and why `.env.example` looks the way it does

**`.env.example` is reproduced byte-for-byte from spec §10**, including the line
`RESEND_FROM=marcus@amr-mohammed.com   # verified domain`. That is the production
shape: Resend only sends to arbitrary recipients from a verified domain.

**This deployment does not use a verified domain.** It sends from Resend's
sandbox sender, `onboarding@resend.dev`, and nothing in the code assumes domain
verification. So the values actually in use are:

```
RESEND_FROM=onboarding@resend.dev
DEMO_REDIRECT_EMAIL=<the Resend account owner's address>
```

Separately, and for a different reason: the seeded leads have synthetic addresses
that would bounce, so **every send is redirected to `DEMO_REDIRECT_EMAIL`**. The
lead's true address is still what the queue displays, what the Slack notification
names, and what is stored — only delivery moves. Redirected emails get a footer
saying which lead they were addressed to, so a demo inbox stays readable. In
production the redirect is absent and the lead is mailed directly.

## Documented assumptions

- **Budget floor of $5,000.** A constant in `lib/prefilter.ts`. It sits below
  Greenscape's real ~$8k project minimum on purpose: its job is to drop
  tire-kickers, not to qualify leads. An $8k–$15k lead stays eligible and is
  judged on its merits, because budget fit is a scoring weight rather than a gate.
- **Dates versus seasons.** §6 forbids "specific calendar dates" while §5 asks the
  drafter to offer "fall availability". The line is drawn at day-level precision:
  seasons and bare months pass, month-plus-day, ordinals and numeric dates do not.
- **`deepseek-chat` no longer exists.** DeepSeek retired that model name on
  2026-07-24; requests using it now error. The adapter uses `deepseek-v4-flash`,
  with thinking mode explicitly disabled (it defaults to on at high effort, which
  is slower and bills extra output tokens for extraction work).
- **Next.js is pinned to 15.5.25** so `middleware.ts` remains the canonical
  convention. Next 16 renamed it to `proxy.ts`.
- **Replies are simulated.** The interface and everything downstream of it are
  real; only the inbound ingestion is mocked.
- **No live GHL.** Supabase stands in for the CRM.

## Notes on cost

`cost_estimate` is persisted per message from a per-provider rate table in
`lib/llm/pricing.ts`, and the dashboard reports cost per action by model, where
one action is a drafted message — a generation call plus its grounding check.
Scoring is billed separately and is excluded from that figure.

On Gemini's free tier the pipeline costs $0. The full 34-lead run on
`deepseek-v4-flash` cost about $0.029, or $0.00085 per drafted message.
