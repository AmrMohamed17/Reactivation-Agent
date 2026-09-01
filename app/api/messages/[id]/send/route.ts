import { NextResponse } from "next/server";
import { sendLeadEmail } from "@/lib/email";
import { notifySlack } from "@/lib/slack";
import { getSupabase } from "@/lib/supabase";
import type { Lead, Message } from "@/lib/types";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("messages")
    .select("*, leads(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Message not found." }, { status: 404 });
  }

  const message = data as Message & { leads: Lead };

  // THE HUMAN-IN-THE-LOOP GATE.
  // Status is re-read from the database here and nothing the caller sends is
  // trusted. Without an explicit human approval this route refuses, which is
  // what stops the public URL from being able to mail real people.
  if (message.status !== "approved") {
    return NextResponse.json(
      {
        error: `Refusing to send: this message is "${message.status}". A human must approve it first.`,
      },
      { status: 400 },
    );
  }

  const lead = message.leads;
  if (!lead?.email) {
    return NextResponse.json(
      { error: "This lead has no email address." },
      { status: 400 },
    );
  }

  const subject = message.final_subject ?? message.draft_subject ?? "";
  const body = message.final_body ?? message.draft_body ?? "";

  try {
    const sent = await sendLeadEmail({ to: lead.email, subject, body });

    const { error: updateError } = await supabase
      .from("messages")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        provider_message_id: sent.providerMessageId,
      })
      .eq("id", id);
    if (updateError) throw new Error(updateError.message);

    const notified = await notifySlack(
      [
        `Reactivation email sent to *${lead.name}* (${lead.tier} ${lead.score}) — ${lead.project_type}`,
        `Subject: ${subject}`,
        `Addressed to ${lead.email}${sent.redirected ? `, delivered to ${sent.deliveredTo} (demo redirect)` : ""}`,
        message.edited_by_human
          ? "Edited by a human before approval."
          : "Approved as drafted.",
      ].join("\n"),
    );

    return NextResponse.json({
      ok: true,
      id,
      provider_message_id: sent.providerMessageId,
      lead_email: lead.email,
      delivered_to: sent.deliveredTo,
      redirected: sent.redirected,
      slack_notified: notified,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    await supabase.from("messages").update({ status: "failed" }).eq("id", id);
    return NextResponse.json(
      { error: `Send failed: ${reason}` },
      { status: 502 },
    );
  }
}
