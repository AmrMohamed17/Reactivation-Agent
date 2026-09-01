"use client";

import { Check, ChevronDown, Send, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { SiteHeader } from "@/components/site-header";
import { needsManualReview } from "@/lib/guardrails";
import type { Extraction } from "@/lib/schemas";
import type { Lead, Message } from "@/lib/types";

export type QueueRow = Message & { leads: Lead };

const TIER_VAR: Record<string, string> = {
  hot: "var(--tier-hot)",
  warm: "var(--tier-warm)",
  cold: "var(--tier-cold)",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <div className="text-muted-foreground text-[11px] tracking-wide uppercase">
        {label}
      </div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

export default function QueueTable({ rows }: { rows: QueueRow[] }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [edits, setEdits] = useState<
    Record<string, { subject: string; body: string }>
  >({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const draftCount = rows.filter((r) => r.status === "drafted").length;
  const approvedCount = rows.filter((r) => r.status === "approved").length;
  const flaggedCount = rows.filter(needsManualReview).length;

  function baseline(row: QueueRow) {
    return {
      subject: row.final_subject ?? row.draft_subject ?? "",
      body: row.final_body ?? row.draft_body ?? "",
    };
  }

  function editFor(row: QueueRow) {
    return edits[row.id] ?? baseline(row);
  }

  function setEdit(
    id: string,
    patch: Partial<{ subject: string; body: string }>,
  ) {
    setEdits((prev) => {
      const row = rows.find((r) => r.id === id)!;
      return { ...prev, [id]: { ...(prev[id] ?? baseline(row)), ...patch } };
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
          ? `Sent. Addressed to ${payload.lead_email}, delivered to ${payload.delivered_to} (demo redirect).${
              payload.slack_notified ? " Slack notified." : ""
            }`
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
    <>
      <SiteHeader active="queue" />

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Review queue</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              {draftCount} awaiting review · {approvedCount} approved ·{" "}
              <span className={flaggedCount > 0 ? "text-destructive" : undefined}>
                {flaggedCount} need manual review
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelected(new Set())}
              >
                Clear
              </Button>
            )}
            <Button
              size="sm"
              onClick={approveSelected}
              disabled={selected.size === 0}
            >
              <Check className="size-4" />
              Approve selected{selected.size > 0 ? ` (${selected.size})` : ""}
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {notice && (
          <Alert className="mt-4">
            <AlertDescription>{notice}</AlertDescription>
          </Alert>
        )}

        <Card className="mt-4 overflow-hidden py-0">
          <CardContent className="px-0">
            {rows.length === 0 && (
              <p className="text-muted-foreground p-8 text-center text-sm">
                Nothing in the queue. Run the scoring and drafting routes first.
              </p>
            )}

            {rows.map((row, index) => {
              const flagged = needsManualReview(row);
              const isOpen = expanded === row.id;
              const edit = editFor(row);
              const extraction = row.leads.extracted as Extraction | null;
              const working = busy.has(row.id);

              return (
                <div
                  key={row.id}
                  className={[
                    index > 0 ? "border-border/60 border-t" : "",
                    // Red is reserved: in this UI it means exactly one thing,
                    // a human needs to look at this.
                    flagged ? "border-l-destructive bg-destructive/5 border-l-2" : "",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Checkbox
                      checked={selected.has(row.id)}
                      onCheckedChange={() => toggleSelected(row.id)}
                      disabled={row.status !== "drafted"}
                      aria-label={`Select ${row.leads.name}`}
                    />

                    <button
                      onClick={() => setExpanded(isOpen ? null : row.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="inline-flex items-center gap-1.5 font-mono text-xs tabular-nums"
                          style={{ color: TIER_VAR[row.leads.tier ?? "cold"] }}
                        >
                          <span
                            className="size-2 rounded-full"
                            style={{
                              backgroundColor: TIER_VAR[row.leads.tier ?? "cold"],
                            }}
                          />
                          {row.leads.score}
                        </span>
                        <span className="text-muted-foreground text-xs capitalize">
                          {row.leads.tier}
                        </span>

                        <span className="text-sm font-medium">
                          {row.leads.name}
                        </span>

                        <span className="text-muted-foreground truncate text-xs">
                          {row.leads.project_type} · {row.leads.loss_reason}
                        </span>

                        {row.status === "approved" && (
                          <Badge variant="secondary">approved</Badge>
                        )}
                        {flagged && (
                          <Badge variant="destructive">
                            <TriangleAlert className="size-3" />
                            needs manual review
                          </Badge>
                        )}
                      </div>
                      <div className="text-muted-foreground mt-1 truncate text-sm">
                        {edit.subject}
                      </div>
                    </button>

                    <ChevronDown
                      className={`text-muted-foreground size-4 shrink-0 transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </div>

                  {isOpen && (
                    <div className="grid gap-6 px-4 pb-5 md:grid-cols-2">
                      {/* Left: the evidence the model was working from. */}
                      <div className="grid gap-4">
                        <Field label="Lead">
                          <div className="grid gap-0.5 text-xs">
                            <span className="font-mono">{row.leads.email}</span>
                            <span className="text-muted-foreground">
                              Site walk {row.leads.had_site_walk ? "yes" : "no"} ·
                              Budget{" "}
                              {row.leads.budget_estimate === null
                                ? "not recorded"
                                : `$${Number(
                                    row.leads.budget_estimate,
                                  ).toLocaleString()}`}
                            </span>
                          </div>
                        </Field>

                        <Field label="Raw notes">
                          <p className="bg-muted/40 rounded-md p-2.5 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                            {row.leads.notes}
                          </p>
                        </Field>

                        <Field label="Extraction">
                          {extraction ? (
                            <dl className="grid gap-1 text-xs">
                              {(
                                [
                                  ["scope", extraction.scope_signals.join("; ")],
                                  ["budget", extraction.budget_signal],
                                  [
                                    "engagement",
                                    extraction.engagement_signals.join("; "),
                                  ],
                                  ["red flags", extraction.red_flags.join("; ")],
                                ] as [string, string][]
                              ).map(([k, v]) => (
                                <div key={k} className="grid grid-cols-[5rem_1fr] gap-2">
                                  <dt className="text-muted-foreground">{k}</dt>
                                  <dd>{v || "—"}</dd>
                                </div>
                              ))}
                            </dl>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              No extraction stored.
                            </span>
                          )}
                        </Field>

                        <Field label="Why this score">
                          <p className="text-xs leading-relaxed">
                            {row.leads.score_reason}
                          </p>
                        </Field>
                      </div>

                      {/* Right: the draft, and the checks run against it. */}
                      <div className="grid gap-3">
                        <div
                          className={`rounded-md border p-2.5 text-xs ${
                            row.verifier_passed === false
                              ? "border-destructive/50 bg-destructive/10 text-destructive"
                              : "border-border/60 text-muted-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-medium">
                            {row.verifier_passed === false ? (
                              <TriangleAlert className="size-3.5" />
                            ) : (
                              <Check className="size-3.5" />
                            )}
                            Grounding check{" "}
                            {row.verifier_passed === false ? "failed" : "passed"}
                          </div>
                          {row.verifier_notes && (
                            <p className="mt-1 leading-relaxed whitespace-pre-wrap">
                              {row.verifier_notes}
                            </p>
                          )}
                        </div>

                        {row.guardrail_flags?.length > 0 && (
                          <ul className="border-destructive/50 bg-destructive/10 text-destructive grid gap-1 rounded-md border p-2.5 text-xs">
                            {row.guardrail_flags.map((flag) => (
                              <li key={flag} className="flex gap-1.5">
                                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                                {flag}
                              </li>
                            ))}
                          </ul>
                        )}

                        <Input
                          value={edit.subject}
                          onChange={(e) =>
                            setEdit(row.id, { subject: e.target.value })
                          }
                          disabled={row.status !== "drafted"}
                          aria-label="Subject"
                        />
                        <Textarea
                          value={edit.body}
                          onChange={(e) =>
                            setEdit(row.id, { body: e.target.value })
                          }
                          disabled={row.status !== "drafted"}
                          rows={14}
                          aria-label="Body"
                          // Prose the customer will read, so it is set in the
                          // UI font. Mono is reserved for data: ids, costs,
                          // token counts and the rep's raw shorthand.
                          className="text-sm leading-relaxed"
                        />

                        <p className="text-muted-foreground font-mono text-[11px]">
                          {row.model} · {row.prompt_version} · $
                          {Number(row.cost_estimate).toFixed(5)}
                          {row.edited_by_human && " · edited by a human"}
                        </p>

                        <Separator />

                        <div className="flex gap-2">
                          {row.status === "drafted" && (
                            <Button
                              size="sm"
                              onClick={() => act(row.id, "approve")}
                              disabled={working}
                            >
                              <Check className="size-4" />
                              {working ? "Working…" : "Approve"}
                            </Button>
                          )}
                          {row.status === "approved" && (
                            <Button
                              size="sm"
                              onClick={() => act(row.id, "send")}
                              disabled={working}
                            >
                              <Send className="size-4" />
                              {working ? "Sending…" : "Send"}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => act(row.id, "reject")}
                            disabled={working}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
