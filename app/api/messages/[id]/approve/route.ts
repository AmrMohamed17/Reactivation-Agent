import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

type Body = {
  final_subject?: string;
  final_body?: string;
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Body;
  const supabase = getSupabase();

  const { data: message, error } = await supabase
    .from("messages")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!message) {
    return NextResponse.json({ error: "Message not found." }, { status: 404 });
  }
  if (message.status !== "drafted") {
    return NextResponse.json(
      {
        error: `Only a drafted message can be approved. This one is "${message.status}".`,
      },
      { status: 400 },
    );
  }

  const subject = body.final_subject?.trim();
  const bodyText = body.final_body?.trim();
  const edited =
    (subject !== undefined && subject !== message.draft_subject) ||
    (bodyText !== undefined && bodyText !== message.draft_body);

  const { error: updateError } = await supabase
    .from("messages")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      edited_by_human: edited,
      // Always recorded, so the send route has a single field to read from
      // whether or not a human changed anything.
      final_subject: subject ?? message.draft_subject,
      final_body: bodyText ?? message.draft_body,
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id, edited_by_human: edited });
}
