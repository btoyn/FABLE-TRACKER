"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Check, CircleCheck, Clock, FileText, HandCoins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { setPromiseStatus } from "../activity-actions";
import { captureMeetingNotes, logLoanUpdate } from "./actions";

export type AttentionRow =
  | {
      kind: "promise";
      id: string;
      urgency: "high" | "medium";
      title: string;
      meta: string;
      lenderId: string | null;
    }
  | {
      kind: "loan";
      id: string;
      urgency: "high" | "medium";
      title: string;
      meta: string;
      lenderId: string | null;
    }
  | {
      kind: "notes";
      id: string;
      urgency: "high" | "medium";
      title: string;
      meta: string;
      lenderId: null;
    };

const ICONS = {
  promise: HandCoins,
  loan: Clock,
  notes: FileText,
} as const;

/**
 * Missing notes, overdue promises and due loan updates in one queue (§5).
 * Each row carries exactly one primary action, ordered most urgent first.
 */
export function AttentionCard({ rows }: { rows: AttentionRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notesFor, setNotesFor] = useState<string | null>(null);

  function run(fn: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result?.error) {
        setError(result.error);
        return;
      }
      setNotesFor(null);
      router.refresh();
    });
  }

  const highCount = rows.filter((r) => r.urgency === "high").length;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">Today&apos;s attention</CardTitle>
          <CardDescription>
            {rows.length === 0
              ? "Nothing needs chasing right now."
              : `${rows.length} item${rows.length === 1 ? "" : "s"}${
                  highCount > 0 ? `, ${highCount} urgent` : ""
                } — promises, loan updates and meeting notes in one place.`}
          </CardDescription>
        </div>
        {rows.length > 0 && (
          <span className="shrink-0 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary tabular-nums">
            {rows.length}
          </span>
        )}
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-success-soft/40 px-4 py-6">
            <CircleCheck className="h-5 w-5 shrink-0 text-success" />
            <div>
              <p className="text-sm font-medium">All clear</p>
              <p className="text-sm text-muted">
                No overdue promises, no loan updates due, no meeting notes waiting.
              </p>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((row) => {
              const Icon = ICONS[row.kind];
              const high = row.urgency === "high";
              return (
                <li key={`${row.kind}-${row.id}`} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        high ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning"
                      }`}
                      title={high ? "Urgent" : "Due soon"}
                    >
                      {high && row.kind === "promise" ? (
                        <AlertTriangle className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug">{row.title}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {row.lenderId ? (
                          <Link
                            href={`/lenders/${row.lenderId}`}
                            className="text-primary hover:underline"
                          >
                            {row.meta}
                          </Link>
                        ) : (
                          row.meta
                        )}
                      </p>
                    </div>

                    <div className="shrink-0">
                      {row.kind === "promise" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={pending}
                          onClick={() => run(() => setPromiseStatus(row.id, "completed"))}
                        >
                          <Check className="h-3.5 w-3.5" /> Mark done
                        </Button>
                      )}
                      {row.kind === "loan" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={pending}
                          onClick={() => run(() => logLoanUpdate(row.id))}
                        >
                          <Check className="h-3.5 w-3.5" /> Log update
                        </Button>
                      )}
                      {row.kind === "notes" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setNotesFor(notesFor === row.id ? null : row.id)}
                        >
                          <FileText className="h-3.5 w-3.5" /> Capture notes
                        </Button>
                      )}
                    </div>
                  </div>

                  {row.kind === "notes" && notesFor === row.id && (
                    <form
                      className="mt-3 space-y-2 rounded-xl border border-border bg-background p-3"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const raw = String(new FormData(e.currentTarget).get("raw") ?? "");
                        run(() => captureMeetingNotes(row.id, raw));
                      }}
                    >
                      <Textarea
                        name="raw"
                        rows={3}
                        autoFocus
                        placeholder="What came up? Anything they promised, anything you owe them, anything personal worth remembering."
                      />
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" disabled={pending}>
                          {pending ? "Saving…" : "Save notes"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setNotesFor(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </CardContent>
    </Card>
  );
}
