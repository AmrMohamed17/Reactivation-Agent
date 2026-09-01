export type LossReason =
  | "price"
  | "competitor"
  | "timing"
  | "went_cold"
  | "unqualified";

export type Tier = "hot" | "warm" | "cold";

export type MessageStatus =
  | "drafted"
  | "approved"
  | "rejected"
  | "sent"
  | "failed";

export type Sentiment = "positive" | "neutral" | "negative";

export type Intent =
  | "interested"
  | "not_interested"
  | "question"
  | "unsubscribe";

export type Lead = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  project_type: string | null;
  budget_estimate: number | null;
  source: string | null;
  original_created_at: string | null;
  last_activity_at: string | null;
  loss_reason: LossReason | null;
  had_site_walk: boolean;
  notes: string | null;
  opt_out: boolean;
  ghl_id: string | null;
  eligible: boolean | null;
  tier: Tier | null;
  score: number | null;
  score_reason: string | null;
  extracted: unknown | null;
  scoring_model: string | null;
  created_at: string;
};

export type Message = {
  id: string;
  lead_id: string;
  channel: string;
  draft_subject: string | null;
  draft_body: string | null;
  final_subject: string | null;
  final_body: string | null;
  status: MessageStatus;
  edited_by_human: boolean;
  model: string | null;
  prompt_version: string | null;
  cost_estimate: number;
  guardrail_flags: string[];
  verifier_passed: boolean | null;
  verifier_notes: string | null;
  created_at: string;
  approved_at: string | null;
  sent_at: string | null;
  provider_message_id: string | null;
};

export type Reply = {
  id: string;
  lead_id: string;
  message_id: string | null;
  body: string;
  sentiment: Sentiment | null;
  intent: Intent | null;
  booked: boolean;
  booked_value: number | null;
  received_at: string;
};
