import { getSupabase } from "@/lib/supabase";
import type { Lead, Message } from "@/lib/types";
import QueueTable, { type QueueRow } from "./QueueTable";

export const dynamic = "force-dynamic";

export default async function QueuePage() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("messages")
    .select("*, leads(*)")
    .in("status", ["drafted", "approved"]);

  if (error) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <h1 className="text-xl font-semibold">Review queue</h1>
        <p className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          Could not load the queue: {error.message}
        </p>
      </main>
    );
  }

  // Highest-value leads first. Sorted here rather than in the query because
  // PostgREST orders the joined rows, not the parent by a joined column.
  const rows = ((data ?? []) as (Message & { leads: Lead })[])
    .filter((row) => row.leads)
    .sort((a, b) => (b.leads.score ?? 0) - (a.leads.score ?? 0)) as QueueRow[];

  return <QueueTable rows={rows} />;
}
