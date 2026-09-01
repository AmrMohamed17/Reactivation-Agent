import { Alert, AlertDescription } from "@/components/ui/alert";
import { SiteHeader } from "@/components/site-header";
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
      <>
        <SiteHeader active="queue" />
        <main className="mx-auto max-w-6xl px-6 py-8">
          <Alert variant="destructive">
            <AlertDescription>
              Could not load the queue: {error.message}
            </AlertDescription>
          </Alert>
        </main>
      </>
    );
  }

  // Highest-value leads first. Sorted here rather than in the query because
  // PostgREST orders the joined rows, not the parent by a joined column.
  const rows = ((data ?? []) as (Message & { leads: Lead })[])
    .filter((row) => row.leads)
    .sort((a, b) => (b.leads.score ?? 0) - (a.leads.score ?? 0)) as QueueRow[];

  return <QueueTable rows={rows} />;
}
