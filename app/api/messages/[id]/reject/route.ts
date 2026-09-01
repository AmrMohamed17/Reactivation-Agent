import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = getSupabase();

  const { data: message, error } = await supabase
    .from("messages")
    .select("id,status")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!message) {
    return NextResponse.json({ error: "Message not found." }, { status: 404 });
  }
  if (message.status === "sent") {
    return NextResponse.json(
      { error: "This message has already been sent and cannot be rejected." },
      { status: 400 },
    );
  }

  const { error: updateError } = await supabase
    .from("messages")
    .update({ status: "rejected" })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id });
}
