import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Funnel } from "@/components/funnel";
import { SiteHeader } from "@/components/site-header";
import { getMetrics } from "@/lib/metrics";

export const dynamic = "force-dynamic";

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

const TIER_VAR: Record<string, string> = {
  hot: "var(--tier-hot)",
  warm: "var(--tier-warm)",
  cold: "var(--tier-cold)",
};

export default async function DashboardPage() {
  let metrics;
  try {
    metrics = await getMetrics();
  } catch (err) {
    return (
      <>
        <SiteHeader active="dashboard" />
        <main className="mx-auto max-w-6xl p-6">
          <Alert variant="destructive">
            <AlertDescription>
              Could not load metrics:{" "}
              {err instanceof Error ? err.message : String(err)}
            </AlertDescription>
          </Alert>
        </main>
      </>
    );
  }

  const { funnel, leads_by_tier, cost, needs_review, replies } = metrics;
  const ineligible = funnel.total_leads - funnel.eligible;
  const tierTotal = ["hot", "warm", "cold"].reduce(
    (sum, t) => sum + (leads_by_tier[t] ?? 0),
    0,
  );

  return (
    <>
      <SiteHeader active="dashboard" />

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* The three numbers the business actually cares about. */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Revenue attributed</CardDescription>
              <CardTitle className="font-mono text-3xl tabular-nums">
                {usd(funnel.attributed_revenue)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-xs">
              from {funnel.booked} booked job{funnel.booked === 1 ? "" : "s"}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Spent on inference</CardDescription>
              <CardTitle className="font-mono text-3xl tabular-nums">
                ${cost.total.toFixed(4)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-xs">
              across {funnel.drafted} drafted message
              {funnel.drafted === 1 ? "" : "s"}
            </CardContent>
          </Card>

          <Card className={needs_review > 0 ? "border-destructive/50" : undefined}>
            <CardHeader className="pb-2">
              <CardDescription>Needs manual review</CardDescription>
              <CardTitle
                className={`font-mono text-3xl tabular-nums ${
                  needs_review > 0 ? "text-destructive" : ""
                }`}
              >
                {needs_review}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs">
              {needs_review > 0 ? (
                <Link href="/queue" className="text-destructive underline">
                  Open the queue
                </Link>
              ) : (
                <span className="text-muted-foreground">
                  nothing held back
                </span>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Funnel</CardTitle>
              <CardDescription>
                Closed-lost leads through to booked revenue.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Funnel
                stages={[
                  { label: "Leads", value: funnel.total_leads },
                  {
                    label: "Eligible",
                    value: funnel.eligible,
                    note: "after pre-filter",
                  },
                  { label: "Drafted", value: funnel.drafted },
                  {
                    label: "Approved",
                    value: funnel.approved,
                    note: "by a human",
                  },
                  { label: "Sent", value: funnel.sent },
                  { label: "Replied", value: funnel.replied },
                  { label: "Booked", value: funnel.booked },
                ]}
              />
            </CardContent>
          </Card>

          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Leads by tier</CardTitle>
                <CardDescription>
                  Scored and ranked by likelihood of re-closing.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2.5">
                {["hot", "warm", "cold"].map((tier) => {
                  const count = leads_by_tier[tier] ?? 0;
                  const pct = tierTotal > 0 ? (count / tierTotal) * 100 : 0;
                  return (
                    <div
                      key={tier}
                      className="grid grid-cols-[3.5rem_1fr_2rem] items-center gap-3"
                    >
                      <span className="text-sm capitalize">{tier}</span>
                      <div className="bg-muted/40 h-2.5 overflow-hidden rounded-full">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: TIER_VAR[tier],
                          }}
                        />
                      </div>
                      <span className="text-right font-mono text-sm tabular-nums">
                        {count}
                      </span>
                    </div>
                  );
                })}
                <div className="border-border/60 text-muted-foreground mt-1 flex justify-between border-t pt-2.5 text-sm">
                  <span>Dropped by pre-filter</span>
                  <span className="font-mono tabular-nums">{ineligible}</span>
                </div>
              </CardContent>
            </Card>

            {funnel.replied > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Replies</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sentiment</span>
                    <span>
                      {Object.entries(replies.sentiment)
                        .map(([k, v]) => `${k} ${v}`)
                        .join(" · ")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Intent</span>
                    <span>
                      {Object.entries(replies.intent)
                        .map(([k, v]) => `${k} ${v}`)
                        .join(" · ")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Cost per action</CardTitle>
            <CardDescription>
              One action is a drafted message: a generation call plus its
              grounding check. Scoring is billed separately and excluded.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                  <TableHead className="text-right">Per action</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cost.by_model.map((row) => (
                  <TableRow key={row.model}>
                    <TableCell className="font-mono text-xs">
                      {row.model}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {row.actions}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      ${row.per_action.toFixed(5)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      ${row.total.toFixed(4)}
                    </TableCell>
                  </TableRow>
                ))}
                {cost.by_model.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-muted-foreground text-center"
                    >
                      No messages generated yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
