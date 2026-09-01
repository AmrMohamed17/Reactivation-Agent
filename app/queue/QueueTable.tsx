"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { needsManualReview } from "@/lib/guardrails";
import type { Extraction } from "@/lib/schemas";
import type { Lead, Message } from "@/lib/types";

export type QueueRow = Message & { leads: Lead };

const TIER_STYLE: Record<string, string> = {
  hot: "bg-amber-100 text-amber-900 border-amber-300",
  warm: "bg-sky-100 text-sky-900 border-sky-300",
  cold: "bg-gray-100 text-gray-700 border-gray-300",
};

export default function QueueTable({ rows }: { rows: QueueRow[] }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, { subject: string; body: string }>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const draftCount = rows.filter((r) => r.status === "drafted").length;
  const approvedCount = rows.filter((r) => r.status === "approved").length;
  const flaggedCount = rows.filter(needsManualReview).length;

  function editFor(row: QueueRow) {
    return (
      edits[row.id] ?? {
        subject: row.final_subject ?? row.draft_subject ?? "",
        body: row.final_body ?? row.draft_body ?? "",
      }
    );
  }

  function setEdit(id: string, patch: Partial<{ subject: string; body: string }>) {
    setEdits((prev) => {
      const row = rows.find((r) => r.id === id)!;
      const current =
        prev[id] ?? {
          subject: row.final_subject ?? row.draft_subject ?? "",
          body: row.final_body ?? row.draft_body ?? "",
        };
      return { ...prev, [id]: { ...current, ...patch } };
    });
  }

  async function act(id: string, action: "approve" | "reject" | "send") {
    setBusy((b) => new Set(b).add(id));
    setError(null);
    setNotice(null);

    const edit = edits[id];
    const res = await fetch(`/api/messages/${id}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        action === "approve" && edit
          ? { final_subject: edit.subject, final_body: edit.body }
          : {},
      ),
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(payload.error ?? `Could not ${action} the message.`);
    } else if (action === "send") {
      setNotice(
        payload.redirected
          ? `Sent. Addressed to ${payload.lead_email}, delivered to ${payload.delivered_to} (demo redirect).${payload.slack_notified ? " Slack notified." : ""}`
          : `Sent to ${payload.delivered_to}.`,
      );
    }

    setBusy((b) => {
      const next = new Set(b);
      next.delete(id);
      return next;
    });
    router.refresh();
  }

  async function approveSelected() {
    const ids = [...selected].filter(
      (id) => rows.find((r) => r.id === id)?.status === "drafted",
    );
    for (const id of ids) await act(id, "approve");
    setSelected(new Set());
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Review queue</h1>
        <Link href="/" className="text-sm text-sky-700 underline">
          Dashboard
        </Link>
      </div>

      <p className="mt-1 text-sm text-gray-600">
        {draftCount} awaiting review · {approvedCount} approved ·{" "}
        <span className={flaggedCount > 0 ? "font-medium text-red-700" : ""}>
          {flaggedCount} need manual review
        </span>
      </p>

      {error && (
        <p className="mt-3 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {notice && (
        <p className="mt-3 rounded border border-green-300 bg-green-50 p-3 text-sm text-green-800">
          {notice}
        </p>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={approveSelected}
          disabled={selected.size === 0}
          className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white disabled:opacity-40"
        >
          Approve selected ({selected.size})
        </button>
        {selected.size > 0 && (
          <button
            onClick={() => setSelected(new Set())}
            className="text-sm text-gray-600 underline"
          >
            Clear
          </button>
        )}
      </div>

      <div className="mt-4 divide-y divide-gray-200 border-y border-gray-200">
        {rows.length === 0 && (
          <p className="py-8 text-sm text-gray-500">
            Nothing in the queue. Run the scoring and drafting routes first.
          </p>
        )}

        {rows.map((row) => {
          const flagged = needsManualReview(row);
          const isOpen = expanded === row.id;
          const edit = editFor(row);
          const extraction = row.leads.extracted as Extraction | null;
          const working = busy.has(row.id);

          return (
            <div
              key={row.id}
              className={flagged ? "border-l-4 border-l-red-500 bg-red-50/40" : ""}
            >
              <div className="flex items-center gap-3 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={selected.has(row.id)}
                  onChange={() => toggleSelected(row.id)}
                  disabled={row.status !== "drafted"}
                  aria-label={`Select ${row.leads.name}`}
                />

                <button
                  onClick={() => setExpanded(isOpen ? null : row.id)}
                  className="flex-1 text-left"
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{row.leads.name}</span>
                    <span
                      className={`rounded border px-1.5 py-0.5 text-xs ${
                        TIER_STYLE[row.leads.tier ?? "cold"]
                      }`}
                    >
                      {row.leads.tier} {row.leads.score}
                    </span>
                    <span className="text-xs text-gray-500">
                      {row.leads.project_type} · {row.leads.loss_reason}
                    </span>
                    {row.status === "approved" && (
                      <span className="rounded border border-green-300 bg-green-100 px-1.5 py-0.5 text-xs text-green-900">
                        approved
                      </span>
                    )}
                    {flagged && (
                      <span className="rounded border border-red-400 bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-800">
                        needs manual review
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-gray-600">
                    {edit.subject}
                  </span>
                </button>

                <span className="text-xs text-gray-400">{isOpen ? "▲" : "▼"}</span>
              </div>

              {isOpen && (
                <div className="grid gap-5 px-3 pb-4 md:grid-cols-2">
                  {/* Left: what the model was given */}
                  <div className="text-sm">
                    <h3 className="font-medium">Lead record</h3>
                    <dl className="mt-1 text-xs text-gray-600">
                      <div>
                        Email: {row.leads.email}{" "}
                        <span className="text-gray-400">
                          (demo sends are redirected)
                        </span>
                      </div>
                      <div>
                        Site walk: {row.leads.had_site_walk ? "yes" : "no"} · Budget:{" "}
                        {row.leads.budget_estimate === null
                          ? "not recorded"
                          : `$${Number(row.leads.budget_estimate).toLocaleString()}`}
                      </div>
                    </dl>

                    <h4 className="mt-3 font-medium">Raw notes</h4>
                    <p className="mt-1 whitespace-pre-wrap rounded bg-gray-100 p-2 text-xs">
                      {row.leads.notes}
                    </p>

                    <h4 className="mt-3 font-medium">Extraction</h4>
                    {extraction ? (
                      <ul className="mt-1 space-y-0.5 text-xs text-gray-700">
                        <li>
                          <span className="text-gray-500">scope:</span>{" "}
                          {extraction.scope_signals.join("; ") || "—"}
                        </li>
                        <li>
                          <span className="text-gray-500">budget:</span>{" "}
                          {extraction.budget_signal || "—"}
                        </li>
                        <li>
                          <span className="text-gray-500">engagement:</span>{" "}
                          {extraction.engagement_signals.join("; ") || "—"}
                        </li>
                        <li>
                          <span className="text-gray-500">red flags:</span>{" "}
                          {extraction.red_flags.join("; ") || "—"}
                        </li>
                      </ul>
                    ) : (
                      <p className="text-xs text-gray-500">No extraction stored.</p>
                    )}

                    <h4 className="mt-3 font-medium">Why this score</h4>
                    <p className="mt-1 text-xs text-gray-700">
                      {row.leads.score_reason}
                    </p>
                  </div>

                  {/* Right: the editable draft */}
                  <div className="text-sm">
                    <h3 className="font-medium">Draft</h3>

                    <div
                      className={`mt-1 rounded border p-2 text-xs ${
                        row.verifier_passed === false
                          ? "border-red-400 bg-red-100 text-red-900"
                          : "border-green-300 bg-green-50 text-green-900"
                      }`}
                    >
                      <span className="font-medium">
                        Grounding check:{" "}
                        {row.verifier_passed === false ? "FAILED" : "passed"}
                      </span>
                      {row.verifier_notes && (
                        <span className="mt-0.5 block whitespace-pre-wrap">
                          {row.verifier_notes}
                        </span>
                      )}
                    </div>

                    {row.guardrail_flags?.length > 0 && (
                      <ul className="mt-2 rounded border border-red-400 bg-red-100 p-2 text-xs text-red-900">
                        {row.guardrail_flags.map((flag) => (
                          <li key={flag}>• {flag}</li>
                        ))}
                      </ul>
                    )}

                    <input
                      value={edit.subject}
                      onChange={(e) => setEdit(row.id, { subject: e.target.value })}
                      disabled={row.status !== "drafted"}
                      className="mt-2 w-full rounded border border-gray-300 px-2 py-1 text-sm disabled:bg-gray-50"
                    />
                    <textarea
                      value={edit.body}
                      onChange={(e) => setEdit(row.id, { body: e.target.value })}
                      disabled={row.status !== "drafted"}
                      rows={12}
                      className="mt-2 w-full rounded border border-gray-300 px-2 py-1 font-mono text-xs disabled:bg-gray-50"
                    />

                    <p className="mt-1 text-xs text-gray-500">
                      {row.model} · {row.prompt_version} · $
                      {Number(row.cost_estimate).toFixed(5)}
                      {row.edited_by_human && " · edited by a human"}
                    </p>

                    <div className="mt-2 flex gap-2">
                      {row.status === "drafted" && (
                        <button
                          onClick={() => act(row.id, "approve")}
                          disabled={working}
                          className="rounded bg-green-700 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                        >
                          {working ? "Working…" : "Approve"}
                        </button>
                      )}
                      {row.status === "approved" && (
                        <button
                          onClick={() => act(row.id, "send")}
                          disabled={working}
                          className="rounded bg-sky-700 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                        >
                          {working ? "Sending…" : "Send"}
                        </button>
                      )}
                      <button
                        onClick={() => act(row.id, "reject")}
                        disabled={working}
                        className="rounded border border-gray-400 px-3 py-1.5 text-sm disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
