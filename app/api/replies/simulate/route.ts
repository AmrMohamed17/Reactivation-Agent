import { NextResponse } from "next/server";
import { completeJSON } from "@/lib/llm";
import {
  CLASSIFY_SYSTEM_PROMPT,
  classifyUserPrompt,
} from "@/lib/prompts/classify";
import { ClassificationSchema } from "@/lib/schemas";
import { getSupabase } from "@/lib/supabase";
import type { Lead } from "@/lib/types";

type Body = {
  /** Preferred: ties the reply to the message that prompted it. */
  message_id?: string;
  lead_id?: string;
  body?: string;
  booked?: boolean;
  booked_value?: number;
};

/**
 * Demo-only inbound. Real inbound email parsing is out of scope for this build,
 * so the reply is injected here — but the classification, storage and
 * attribution downstream of it are real.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body.body?.trim()) {
    return NextResponse.json(
      { error: "A reply body is required." },
      { status: 400 },
    );
  }

  const supabase = getSupabase();

  let leadId = body.lead_id;
  const messageId = body.message_id ?? null;

  if (messageId) {
    const { data: message, error } = await supabase
      .from("messages")
      .select("id,lead_id")
      .eq("id", messageId)
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!message) {
      return NextResponse.json({ error: "Message not found." }, { status: 404 });
    }
    leadId = message.lead_id as string;
  }

  if (!leadId) {
    return NextResponse.json(
      { error: "Provide either a message_id or a lead_id." },
      { status: 400 },
    );
  }

  const { data: leadRow, error: leadError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .maybeSingle();
  if (leadError) {
    return NextResponse.json({ error: leadError.message }, { status: 500 });
  }
  if (!leadRow) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }
  const lead = leadRow as Lead;

  const classification = await completeJSON({
    system: CLASSIFY_SYSTEM_PROMPT,
    user: classifyUserPrompt(lead, body.body),
    schema: ClassificationSchema,
    temperature: 0,
  });

  const booked = body.booked === true;
  const { data: reply, error: insertError } = await supabase
    .from("replies")
    .insert({
      lead_id: leadId,
      message_id: messageId,
      body: body.body,
      sentiment: classification.data.sentiment,
      intent: classification.data.intent,
      booked,
      booked_value: booked ? (body.booked_value ?? null) : null,
    })
    .select("id")
    .maybeSingle();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Honour an unsubscribe immediately: the pre-filter reads opt_out, so this
  // lead will be excluded from every future run.
  let optedOut = false;
  if (classification.data.intent === "unsubscribe") {
    const { error: optOutError } = await supabase
      .from("leads")
      .update({ opt_out: true })
      .eq("id", leadId);
    optedOut = !optOutError;
  }

  return NextResponse.json({
    ok: true,
    reply_id: reply?.id,
    lead: lead.name,
    sentiment: classification.data.sentiment,
    intent: classification.data.intent,
    booked,
    booked_value: booked ? (body.booked_value ?? null) : null,
    opted_out: optedOut,
    cost: classification.costEstimate,
  });
}
