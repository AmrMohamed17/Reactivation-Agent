import Link from "next/link";
import { getMetrics } from "@/lib/metrics";

export const dynamic = "force-dynamic";

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded border border-gray-300 p-3">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {hint && <div className="text-xs text-gray-500">{hint}</div>}
    </div>
  );
}

export default async function DashboardPage() {
  let metrics;
  try {
    metrics = await getMetrics();
  } catch (err) {
    return (
      <main className="mx-auto max-w-5xl p-8">
        <h1 className="text-xl font-semibold">Greenscape Pro — Reactivation Agent</h1>
        <p className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          Could not load metrics: {err instanceof Error ? err.message : String(err)}
        </p>
      </main>
    );
  }

  const { funnel, leads_by_tier, cost, needs_review, replies } = metrics;

  const steps: [string, number][] = [
    ["Leads", funnel.total_leads],
    ["Eligible", funnel.eligible],
    ["Drafted", funnel.drafted],
    ["Approved", funnel.approved],
    ["Sent", funnel.sent],
    ["Replied", funnel.replied],
    ["Booked", funnel.booked],
  ];

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Greenscape Pro — Reactivation Agent</h1>
        <Link href="/queue" className="text-sm text-sky-700 underline">
          Review queue
        </Link>
      </div>

      <h2 className="mt-6 text-sm font-medium uppercase tracking-wide text-gray-500">
        Funnel
      </h2>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        {steps.map(([label, value]) => (
          <Stat key={label} label={label} value={String(value)} />
        ))}
        <Stat label="Attributed" value={usd(funnel.attributed_revenue)} />
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section>
          <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">
            Leads by tier
          </h2>
          <table className="mt-2 w-full text-sm">
            <tbody>
              {["hot", "warm", "cold"].map((tier) => (
                <tr key={tier} className="border-b border-gray-200">
                  <td className="py-1.5 capitalize">{tier}</td>
                  <td className="py-1.5 text-right">{leads_by_tier[tier] ?? 0}</td>
                </tr>
              ))}
              <tr>
                <td className="py-1.5 text-gray-500">
                  Ineligible (dropped by pre-filter)
                </td>
                <td className="py-1.5 text-right text-gray-500">
                  {funnel.total_leads - funnel.eligible}
                </td>
              </tr>
            </tbody>
          </table>

          {needs_review > 0 && (
            <p className="mt-3 rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">
              {needs_review} draft{needs_review === 1 ? "" : "s"} held for manual
              review.{" "}
              <Link href="/queue" className="underline">
                Open the queue
              </Link>
            </p>
          )}
        </section>

        <section>
          <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">
            Cost per action
          </h2>
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="border-b border-gray-300 text-left text-xs text-gray-500">
                <th className="py-1.5 font-medium">Model</th>
                <th className="py-1.5 text-right font-medium">Actions</th>
                <th className="py-1.5 text-right font-medium">Per action</th>
                <th className="py-1.5 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {cost.by_model.map((row) => (
                <tr key={row.model} className="border-b border-gray-200">
                  <td className="py-1.5 font-mono text-xs">{row.model}</td>
                  <td className="py-1.5 text-right">{row.actions}</td>
                  <td className="py-1.5 text-right">${row.per_action.toFixed(5)}</td>
                  <td className="py-1.5 text-right">${row.total.toFixed(4)}</td>
                </tr>
              ))}
              {cost.by_model.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-2 text-gray-500">
                    No messages generated yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-gray-500">
            One action is a drafted message: a generation call plus its grounding
            check. Scoring is billed separately and is not included here.
          </p>
        </section>
      </div>

      {funnel.replied > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">
            Replies
          </h2>
          <p className="mt-2 text-sm text-gray-700">
            Sentiment:{" "}
            {Object.entries(replies.sentiment)
              .map(([k, v]) => `${k} ${v}`)
              .join(" · ") || "—"}
          </p>
          <p className="text-sm text-gray-700">
            Intent:{" "}
            {Object.entries(replies.intent)
              .map(([k, v]) => `${k} ${v}`)
              .join(" · ") || "—"}
          </p>
        </section>
      )}
    </main>
  );
}
