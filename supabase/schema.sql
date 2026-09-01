-- Greenscape Pro — Reactivation Agent
-- Paste-runnable in the Supabase SQL editor. Safe to re-run: drops and recreates.

create extension if not exists "pgcrypto";

drop table if exists replies;
drop table if exists messages;
drop table if exists leads;

create table leads (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  email               text,
  phone               text,
  project_type        text,
  budget_estimate     numeric,
  source              text,
  original_created_at timestamptz,
  last_activity_at    timestamptz,
  loss_reason         text check (loss_reason in ('price','competitor','timing','went_cold','unqualified')),
  had_site_walk       boolean not null default false,
  notes               text,
  opt_out             boolean not null default false,
  ghl_id              text,
  -- set by the deterministic pre-filter
  eligible            boolean,
  -- set by the LLM analyze stage
  tier                text check (tier in ('hot','warm','cold')),
  score               int check (score between 0 and 100),
  score_reason        text,
  extracted           jsonb,
  scoring_model       text,
  created_at          timestamptz not null default now()
);

create table messages (
  id                  uuid primary key default gen_random_uuid(),
  lead_id             uuid not null references leads(id) on delete cascade,
  channel             text not null default 'email',
  draft_subject       text,
  draft_body          text,
  -- populated only when a human edits before approving
  final_subject       text,
  final_body          text,
  status              text not null default 'drafted'
                        check (status in ('drafted','approved','rejected','sent','failed')),
  edited_by_human     boolean not null default false,
  model               text,
  prompt_version      text,
  cost_estimate       numeric not null default 0,
  guardrail_flags     jsonb not null default '[]'::jsonb,
  verifier_passed     boolean,
  verifier_notes      text,
  created_at          timestamptz not null default now(),
  approved_at         timestamptz,
  sent_at             timestamptz,
  provider_message_id text
);

create table replies (
  id           uuid primary key default gen_random_uuid(),
  lead_id      uuid not null references leads(id) on delete cascade,
  message_id   uuid references messages(id) on delete set null,
  body         text not null,
  sentiment    text check (sentiment in ('positive','neutral','negative')),
  intent       text check (intent in ('interested','not_interested','question','unsubscribe')),
  booked       boolean not null default false,
  booked_value numeric,
  received_at  timestamptz not null default now()
);

create index leads_tier_idx      on leads (tier);
create index leads_eligible_idx  on leads (eligible);
create index messages_lead_idx   on messages (lead_id);
create index messages_status_idx on messages (status);
create index replies_lead_idx    on replies (lead_id);
create index replies_message_idx on replies (message_id);

-- RLS on with zero policies: the anon/publishable key can read nothing.
-- The server-side service-role key bypasses RLS, and it is the only key this
-- app ever uses for data access.
alter table leads    enable row level security;
alter table messages enable row level security;
alter table replies  enable row level security;
