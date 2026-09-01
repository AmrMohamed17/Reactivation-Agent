# Reactivation Agent — Architecture

**Client:** Greenscape Pro (high-end residential outdoor design-build, Phoenix AZ)
**Purpose:** Convert ~1,400 closed-lost leads into booked jobs via personalized, Marcus-voiced re-engagement — with a human approving every send.
**Context:** This is the P0 for the isthispossible.ai take-home. Everything here maps to a specific grading requirement. Read `GRADING MAP` at the bottom before cutting scope.

---

## 1. Non-negotiable requirements (from the brief)

Each must be satisfied by something *real*, not stubbed:

1. **Deployed** at a public URL (Vercel). Localhost is not acceptable.
2. **GitHub repo with real commit history** — one commit per build phase, meaningful messages. A single mega-commit is an explicit red flag.
3. **Persistent storage** — Supabase (Postgres). No localStorage / in-memory / JSON files.
4. **Real LLM doing meaningful work** — a 4-stage pipeline (extract → score → draft → verify), not a mail-merge. See §5.
5. **At least one external integration** — Resend (outbound email) + Slack webhook (internal notify). Two, both real.
6. **Documented `.env.example`** — clone-and-run.

Strongly encouraged (all included here): human-in-the-loop approval, guardrails on model output, explicit cost/model reasoning, a functional admin view.

---

## 2. Stack

| Layer | Choice | Notes |
|---|---|---|
| App | Next.js (App Router, TypeScript) | Single full-stack repo: UI + `/api` route handlers. No separate backend host. |
| Styling | Tailwind | Functional, not pretty. |
| Hosting | Vercel Hobby | Free. |
| DB | Supabase (Postgres) | Free tier. Service-role key server-side only. |
| LLM | Provider abstraction | Default **Gemini 2.5 Flash** (free, US). Dev on **DeepSeek** (`deepseek-chat`). Optional OpenAI adapter. Switch via `LLM_PROVIDER`. |
| Email | Resend | Free tier (100/day, 1 verified domain). |
| Notify | Slack incoming webhook | Free. |
| Auth | Single passcode via middleware | `APP_PASSCODE`. The public URL can trigger real emails, so it must be gated. |

**Why single repo, not their two-repo (Vercel + Railway) pattern:** their split is for independent scaling and long-running background workers. Sends here are human-triggered (button click), not a background job, so a second repo/host is ops overhead with no benefit at this scale. Would split the moment a scheduled-drip or reply-polling worker exists. (This is a deliberate, defensible deviation — see it called out in STRATEGY.md.)

**Why Gemini default, DeepSeek only for dev:** DeepSeek is a Chinese model; the client is US-based with customer PII, and US clients push back on Chinese providers for data-residency reasons (client raised this themselves). So dev on DeepSeek for iteration speed / rate-limit headroom, but the documented default for a US client is a US provider. This is the "sensible cost/model considerations" the brief rewards — make the reasoning explicit in STRATEGY.md and the Loom.

---

## 3. Data model (Supabase / Postgres)

### `leads`
| col | type | notes |
|---|---|---|
| id | uuid pk | |
| name | text | |
| email | text | |
| phone | text | |
| project_type | text | e.g. pergola, outdoor kitchen |
| budget_estimate | numeric | |
| source | text | meta / google / referral |
| original_created_at | timestamptz | when lead first came in |
| last_activity_at | timestamptz | |
| loss_reason | text | check: `price` \| `competitor` \| `timing` \| `went_cold` \| `unqualified` |
| had_site_walk | boolean | strong re-close signal |
| notes | text | **messy free text** — the raw material |
| opt_out | boolean | default false |
| ghl_id | text null | prod linkage; null in demo |
| eligible | boolean null | set by pre-filter |
| tier | text null | check: `hot` \| `warm` \| `cold` |
| score | int null | 0–100 |
| score_reason | text null | model's justification |
| extracted | jsonb null | structured extraction output |
| scoring_model | text null | which provider/model scored it |
| created_at | timestamptz | default now() |

### `messages`
| col | type | notes |
|---|---|---|
| id | uuid pk | |
| lead_id | uuid fk → leads | |
| channel | text | default `email` |
| draft_subject | text | |
| draft_body | text | |
| final_subject | text null | after human edit |
| final_body | text null | after human edit |
| status | text | check: `drafted` \| `approved` \| `rejected` \| `sent` \| `failed`; default `drafted` |
| edited_by_human | boolean | default false |
| model | text | provider/model used |
| prompt_version | text | e.g. `draft_v1` |
| cost_estimate | numeric | tokens × per-provider rate |
| guardrail_flags | jsonb | default `[]` |
| verifier_passed | boolean | grounding check result |
| verifier_notes | text null | unsupported claims found |
| created_at / approved_at / sent_at | timestamptz | |
| provider_message_id | text null | Resend id |

### `replies`
| col | type | notes |
|---|---|---|
| id | uuid pk | |
| lead_id | uuid fk | |
| message_id | uuid fk null | |
| body | text | |
| sentiment | text | `positive` \| `neutral` \| `negative` |
| intent | text | `interested` \| `not_interested` \| `question` \| `unsubscribe` |
| booked | boolean | default false |
| booked_value | numeric null | attributed revenue |
| received_at | timestamptz | default now() |

Provide schema as `supabase/schema.sql` (paste-runnable in the Supabase SQL editor).

---

## 4. Seed data

~50 synthetic leads via `scripts/seed.ts`, spanning:
- All five `loss_reason` values.
- Mix of `had_site_walk` true/false and budget fits — so tiers visibly differ.
- Several `opt_out = true` and several `unqualified` / pure price-shoppers → **must be dropped by the pre-filter** (proves the filter discriminates).
- 2–3 "trap" leads whose notes tempt the model to invent a discount or a delivery date → **the verifier must catch these** (great Loom moment).
- At least one clean "warm/timing" lead (site walk done, budget fit, paused for timing) — the canonical happy-path demo.
- Realistic messy notes (fragments, abbreviations, dates), not clean sentences.

---

## 5. LLM pipeline (the "meaningful work")

Four logical stages. Every model output is JSON, validated with zod before use.

**Stage 1 — Extract.** Messy `notes` + structured fields → JSON `{ scope_signals[], budget_signal, loss_reason_confirmed, engagement_signals[], red_flags[] }`. Real information extraction from unstructured text.

**Stage 2 — Score.** Extraction + rules → `{ tier, score (0–100), reason }`. Rules weight: had_site_walk (heavy), budget fit, and loss_reason (`timing`/`went_cold` = warmer; `price`/`competitor` = cooler; `unqualified` never reaches here). The `reason` is a written justification — reasoned prioritization, not a label.

> Implementation note: Stages 1–2 may be **one combined call** returning both extraction and score, to conserve Gemini's free-tier rate limit. Keep them as distinct sections in the prompt and the JSON.

**Stage 3 — Draft.** Strategy-aware generation in Marcus's voice. **The re-engagement angle changes by loss_reason:**
- `timing` → "your timeline's probably shifted, we have fall availability"
- `competitor` → "wanted to check in and see how the project turned out / what you decided"
- `went_cold` → soft re-open referencing the specific project
- `price` → value/финancing-neutral re-open, **no invented discount**

System prompt encodes voice + hard constraints: use only facts present in the lead record; exactly one CTA; length cap; no invented prices, discounts, dates, or promises.

**Stage 4 — Verify (grounding pass).** Separate call: "Does every factual claim in this draft trace to the lead record? List unsupported claims." → sets `verifier_passed`, `verifier_notes`. This is the literal answer to the brief's "what happens if the model returns garbage."

---

## 6. Guardrails

- **Schema:** zod-validate every LLM JSON output. On parse failure, retry once with a stricter instruction.
- **Content rules** (deterministic, `lib/guardrails.ts`): draft MUST contain the lead's first name and reference `project_type` or a scope signal; MUST NOT contain `$`, `%`, "discount", "free", "guarantee", or specific calendar dates unless whitelisted; single CTA; length ≤ cap.
- **Verifier gate:** if `verifier_passed = false` OR any content rule trips → do **not** auto-approve; set `guardrail_flags`, surface prominently in the queue as "needs manual review." Never silently drop.
- **Rate limits:** Gemini free tier is 10 RPM. All batch LLM calls go through a throttle (concurrency 1–2) + exponential backoff on HTTP 429 (1s→2s→4s→8s). `lib/llm/withRetry.ts`. Non-negotiable — batch runs fail without it.

---

## 7. API routes (App Router route handlers)

| Route | Method | Does |
|---|---|---|
| `/api/score` | POST | Pre-filter all leads, then LLM analyze (extract+score) eligible ones. Throttled + backoff. |
| `/api/drafts/generate` | POST | Body `{ lead_ids[] }` or `{ tier }`. Draft + verify per lead. |
| `/api/messages/[id]/approve` | POST | Body may include edited `final_subject`/`final_body`; sets `approved`, `edited_by_human`, `approved_at`. |
| `/api/messages/[id]/reject` | POST | Sets `rejected`. |
| `/api/messages/[id]/send` | POST | **HARD GATE: 400 unless status === `approved`.** Sends via Resend (redirected in demo), sets `sent` + `provider_message_id`, posts Slack ping. |
| `/api/replies/simulate` | POST | Demo only: inject a reply, classify sentiment/intent, optionally mark booked + value. |
| `/api/metrics` | GET | Funnel counts + total $ attributed. |

All DB access server-side with the service-role key. Never expose it client-side.

---

## 8. Frontend

Passcode middleware (`middleware.ts`) gates everything except `/login`. `/login` posts the passcode, sets an httpOnly cookie.

- **`/` — dashboard:** funnel (eligible → drafted → approved → sent → replied → booked → **$ attributed**) + leads-by-tier table.
- **`/queue` — the core screen (what you screen-share):** rows for drafted/approved messages; expand a row to show the lead's raw notes + extraction **next to** the editable draft; Approve / Reject / Edit / Send; batch-approve; **verifier flags shown in red** on any flagged draft.

Minimal Tailwind. Functional over pretty (explicitly fine per the brief).

---

## 9. Cost tracking

`cost_estimate` per message = tokens × per-provider rate table (`lib/llm/pricing.ts`). Gemini free = $0; DeepSeek and OpenAI from their public rates. Dashboard shows cost/action per provider — feeds the "which model, why, per-action cost" grading line.

---

## 10. Environment (`.env.example`)

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
# LLM
LLM_PROVIDER=gemini            # gemini | deepseek | openai
GEMINI_API_KEY=
DEEPSEEK_API_KEY=
OPENAI_API_KEY=                # optional
# Email
RESEND_API_KEY=
RESEND_FROM=marcus@amr-mohammed.com   # verified domain
DEMO_REDIRECT_EMAIL=          # all demo sends land here; real address still displayed
# Slack
SLACK_WEBHOOK_URL=
# Auth
APP_PASSCODE=
```

**Resend gotcha:** free tier only sends to arbitrary addresses from a **verified domain** — verify `amr-mohammed.com`. Synthetic leads have fake emails that would bounce, so `DEMO_REDIRECT_EMAIL` routes every real send to your own inbox while the UI still shows the lead's true address. State this in the Loom: "delivery redirected to my inbox in demo; prod sends to the lead via GHL."

---

## 11. Build phases (one commit each — NO mega-commit)

0. **Scaffold** — Next.js + TS + Tailwind, repo init, Vercel + Supabase projects, env wiring, deploy the empty app (prove the pipeline to prod early).
1. **Schema + seed** — `schema.sql`, `scripts/seed.ts`, ~50 leads per §4.
2. **LLM provider layer** — `lib/llm/` interface + gemini/deepseek/openai adapters, `withRetry`, pricing table, one live test call.
3. **Scoring** — pre-filter + analyze → `/api/score`; tiers + reasons persisted.
4. **Drafting + guardrails + verify** — `/api/drafts/generate`.
5. **Review queue UI** — `/queue`, expand/edit/approve/reject, verifier flags visible.
6. **Send** — Resend (demo redirect) + Slack ping + `/api/messages/[id]/send` with the hard gate.
7. **Replies + metrics** — `/api/replies/simulate`, sentiment/intent, `/api/metrics`, dashboard.
8. **Docs + deploy verify** — README, this file, `STRATEGY.md`, `.env.example`; confirm prod works end-to-end.

Deploy at phase 0 and keep it green — don't leave deployment to the last hour.

---

## 12. Grading map (why each piece exists)

- **Strategy 40%** → `STRATEGY.md` (5 agents, the "de-Marcus the workflow" thesis, both reflective answers, the notes-contradiction catch).
- **Build 40%** → real DB (§3), 4-stage LLM (§5), guardrails + verify (§6), two real integrations (§7 send), human-in-loop (§8), cost reasoning (§9), commit history (§11).
- **Communication 20%** → ≤5-min Loom: top-3 agents → live happy path (warm lead → draft → verifier → approve → send → reply → booked) → architecture decisions (why Supabase, why Gemini-default/DeepSeek-dev, why single repo) → what's next (quote agent P1, reusing this spine).

## 13. Documented assumptions (put in STRATEGY.md)
- No live GHL access → Supabase stands in; prod reads/writes GHL via its API.
- Synthetic leads → free-tier data-training caveat is moot; production uses a paid/US tier.
- Replies simulated (no inbound email parsing in 24h) → interface is real, ingestion is mocked.
- Demo email delivery redirected to a test inbox.
