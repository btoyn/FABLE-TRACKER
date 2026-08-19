"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Banknote, Plus, RotateCcw, Search, Trash2, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label } from "@/components/ui/input";
import { matchScore } from "@/lib/fuzzy";
import { type LookState, isLookOpen, lookTitle } from "@/lib/looks";
import { cn, relativeDays } from "@/lib/utils";
import {
  deleteLook,
  logFollowUp,
  logLook,
  markBecameLoan,
  markWentNowhere,
  reopenLook,
} from "./actions";

export interface LookRow {
  id: string;
  borrowerName: string | null;
  notes: string | null;
  stage: string;
  receivedAt: string | null;
  lenderId: string | null;
  lenderName: string | null;
  institution: string | null;
  attempts: number;
  dormantReason: string | null;
  daysLate: number;
  state: LookState;
}

export interface LookLender {
  id: string;
  name: string;
  institution: string | null;
}

const STATE_STYLE: Record<LookState, { dot: string; label: string; tone: string }> = {
  scheduled: { dot: "bg-teal", label: "Follow-up set", tone: "text-teal" },
  due: { dot: "bg-gold", label: "Follow up now", tone: "text-[#8a6215]" },
  overdue: { dot: "bg-danger", label: "Follow-up overdue", tone: "text-danger" },
  became_loan: { dot: "bg-primary", label: "Became a loan", tone: "text-primary" },
  went_nowhere: { dot: "bg-[#c9cfdd]", label: "Went nowhere", tone: "text-muted" },
};

export function LookList({
  rows,
  lenders,
  topLenders,
  becameLoans,
}: {
  rows: LookRow[];
  lenders: LookLender[];
  topLenders: { id: string; name: string; count: number }[];
  becameLoans: number;
}) {
  const [adding, setAdding] = useState(false);

  const open = rows.filter((r) => isLookOpen(r.stage));
  const closed = rows.filter((r) => !isLookOpen(r.stage));
  const owed = open.filter((r) => r.state !== "scheduled").length;

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[14px]">
              {open.length === 0 ? (
                <span className="text-muted">Nothing waiting on you.</span>
              ) : owed === 0 ? (
                <>
                  <span className="font-semibold">{open.length} open</span>{" "}
                  <span className="text-muted">
                    {open.length === 1 ? "look" : "looks"}, all followed up
                  </span>
                </>
              ) : (
                <>
                  <span className="font-semibold text-[#8a6215]">{owed}</span>{" "}
                  <span className="text-muted">
                    {owed === 1 ? "needs" : "need"} a follow-up · {open.length} open
                  </span>
                </>
              )}
            </p>
            {!adding && (
              <Button size="sm" onClick={() => setAdding(true)}>
                <Plus className="h-4 w-4" /> Log a look
              </Button>
            )}
          </div>

          {adding && <AddLook lenders={lenders} onDone={() => setAdding(false)} />}

          {open.length === 0 && !adding ? (
            <EmptyState
              title="No open looks"
              description="Any time a lender mentions a possible deal — even a vague one, even without a borrower name — log it here and it will come back for follow-up."
              className="py-8"
            />
          ) : (
            <ul className="divide-y divide-hairline">
              {open.map((look) => (
                <LookItem key={look.id} look={look} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {topLenders.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="mb-1 text-[13px] font-semibold">Who&apos;s reaching out</p>
            <p className="mb-3 text-[12.5px] text-muted">
              Looks brought to you, most first
              {becameLoans > 0 && ` · ${becameLoans} became a loan`}
            </p>
            <ul className="space-y-2">
              {topLenders.map((l) => (
                <li key={l.id} className="flex items-center gap-3">
                  <Link
                    href={`/lenders/${l.id}`}
                    className="min-w-0 flex-1 truncate text-[13.5px] font-medium hover:underline"
                  >
                    {l.name}
                  </Link>
                  <div
                    aria-hidden="true"
                    className="h-1.5 rounded-full bg-primary"
                    style={{ width: `${(l.count / topLenders[0].count) * 40 + 8}%` }}
                  />
                  <span className="w-6 shrink-0 text-right text-[13px] tabular-nums text-muted">
                    {l.count}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {closed.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="mb-3 text-[13px] font-semibold text-muted">Closed ({closed.length})</p>
            <ul className="divide-y divide-hairline">
              {closed.map((look) => (
                <LookItem key={look.id} look={look} />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AddLook({ lenders, onDone }: { lenders: LookLender[]; onDone: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<LookLender | null>(null);
  const [notes, setNotes] = useState("");
  const [borrower, setBorrower] = useState("");
  const [error, setError] = useState<string | null>(null);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return lenders
      .map((l) => ({ l, score: matchScore(query, { name: l.name, institution: l.institution }) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((r) => r.l);
  }, [query, lenders]);

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await logLook({
        lenderId: picked?.id ?? "",
        notes,
        borrowerName: borrower,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setNotes("");
      setBorrower("");
      setPicked(null);
      setQuery("");
      router.refresh();
      onDone();
    });
  }

  return (
    <div className="mb-4 space-y-3 rounded-xl border border-border bg-background p-4">
      <div>
        <Label htmlFor="look-lender">Who brought it up?</Label>
        {picked ? (
          <div className="flex items-center gap-2 rounded-[10px] border border-primary/40 bg-primary-soft/50 px-3 py-2">
            <span className="flex-1 text-[14px] font-medium">{picked.name}</span>
            <button
              type="button"
              onClick={() => setPicked(null)}
              aria-label="Pick a different lender"
              className="rounded-lg p-1 text-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                id="look-lender"
                value={query}
                autoFocus
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search lenders…"
                className="pl-9"
              />
            </div>
            {results.length > 0 && (
              <ul className="mt-1 overflow-hidden rounded-[10px] border border-border">
                {results.map((l) => (
                  <li key={l.id}>
                    <button
                      type="button"
                      onClick={() => setPicked(l)}
                      className="flex w-full items-baseline gap-2 px-3 py-2 text-left transition-colors hover:bg-primary-soft/60"
                    >
                      <span className="text-[14px] font-medium">{l.name}</span>
                      {l.institution && (
                        <span className="text-[12.5px] text-muted">{l.institution}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      <div>
        <Label htmlFor="look-notes">What did they ask about?</Label>
        <textarea
          id="look-notes"
          value={notes}
          rows={3}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Wondered whether a dental practice buying its own building qualifies for 504. Owner-occupied, thinks around $2M. Said he'd get me the details."
          className="w-full rounded-[10px] border border-border bg-surface px-3 py-2.5 text-[13.5px] leading-relaxed outline-none transition-colors focus:border-primary/40"
        />
      </div>

      <div>
        <Label htmlFor="look-borrower">Borrower, if there is one yet</Label>
        <Input
          id="look-borrower"
          value={borrower}
          onChange={(e) => setBorrower(e.target.value)}
          placeholder="Optional"
        />
      </div>

      {error && <p className="text-[13.5px] text-danger">{error}</p>}

      <div className="flex gap-2">
        <Button size="touch" onClick={submit} disabled={pending || !picked || !notes.trim()}>
          {pending ? "Saving…" : "Log it"}
        </Button>
        <Button size="touch" variant="quiet" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

type Panel = "followup" | "nowhere" | null;

function LookItem({ look }: { look: LookRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [panel, setPanel] = useState<Panel>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const style = STATE_STYLE[look.state];
  const isOpen = isLookOpen(look.stage);

  function run(fn: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.error) {
        setError(result.error);
        return;
      }
      setPanel(null);
      setNote("");
      router.refresh();
    });
  }

  return (
    <li className="py-3.5 first:pt-0">
      <div className="flex flex-wrap items-start gap-3">
        <span
          aria-hidden="true"
          className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", style.dot)}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-semibold">
            {lookTitle({ borrowerName: look.borrowerName, notes: look.notes })}
          </p>
          <p className="mt-0.5 text-[12.5px] text-muted">
            {look.lenderId ? (
              <Link
                href={`/lenders/${look.lenderId}`}
                className="hover:text-foreground hover:underline"
              >
                {look.lenderName}
              </Link>
            ) : (
              "No lender linked"
            )}
            {look.institution && ` · ${look.institution}`}
            {look.receivedAt && ` · came in ${relativeDays(look.receivedAt)}`}
          </p>
          <p className={cn("mt-1 text-[12.5px] font-medium", style.tone)}>
            {style.label}
            {look.state === "overdue" && ` · ${look.daysLate} days late`}
            {look.attempts > 0 &&
              ` · followed up ${look.attempts} time${look.attempts === 1 ? "" : "s"}`}
            {look.dormantReason && ` · ${look.dormantReason}`}
          </p>
          {look.borrowerName && look.notes && (
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{look.notes}</p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {isOpen ? (
            <>
              <Button
                size="sm"
                onClick={() => setPanel((p) => (p === "followup" ? null : "followup"))}
                disabled={pending}
              >
                Followed up
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => run(() => markBecameLoan(look.id))}
                disabled={pending}
                title="It's a real loan now — track it on the Loans page"
              >
                <Banknote className="h-3.5 w-3.5" /> Became a loan
              </Button>
              <Button
                size="sm"
                variant="quiet"
                onClick={() => setPanel((p) => (p === "nowhere" ? null : "nowhere"))}
                disabled={pending}
                title="Went nowhere"
              >
                <XCircle className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => run(() => reopenLook(look.id))}
                disabled={pending}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reopen
              </Button>
              <Button
                size="sm"
                variant="quiet"
                onClick={() => run(() => deleteLook(look.id))}
                disabled={pending}
                title="Move to Trash"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      {!look.borrowerName && look.notes && isOpen && (
        <p className="mt-2 pl-[22px] text-[13px] leading-relaxed text-muted">{look.notes}</p>
      )}

      {panel === "followup" && (
        <div className="mt-3 space-y-2.5 rounded-xl border border-border bg-background p-3.5">
          <Label htmlFor={`fu-${look.id}`}>What did you tell them? (optional)</Label>
          <textarea
            id={`fu-${look.id}`}
            value={note}
            rows={3}
            autoFocus
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Walked him through the 51% occupancy rule. Sending him a sources and uses to look at."
            className="w-full rounded-[10px] border border-border bg-surface px-3 py-2.5 text-[13.5px] leading-relaxed outline-none transition-colors focus:border-primary/40"
          />
          <p className="text-[12px] text-muted">
            Saved to {look.lenderName ?? "the lender"}&apos;s timeline, counts as a touch, and sets
            the next follow-up.
          </p>
          <div className="flex gap-2">
            <Button size="touch" onClick={() => run(() => logFollowUp(look.id, note))} disabled={pending}>
              {pending ? "Saving…" : "Log it"}
            </Button>
            <Button size="touch" variant="quiet" onClick={() => setPanel(null)} disabled={pending}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {panel === "nowhere" && (
        <div className="mt-3 space-y-2.5 rounded-xl border border-border bg-background p-3.5">
          <Label htmlFor={`nw-${look.id}`}>Why? (optional)</Label>
          <Input
            id={`nw-${look.id}`}
            value={note}
            autoFocus
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Borrower went conventional"
          />
          <p className="text-[12px] text-muted">Stops the follow-up clock. The record stays.</p>
          <div className="flex gap-2">
            <Button
              size="touch"
              onClick={() => run(() => markWentNowhere(look.id, note))}
              disabled={pending}
            >
              {pending ? "Saving…" : "Close it"}
            </Button>
            <Button size="touch" variant="quiet" onClick={() => setPanel(null)} disabled={pending}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-[13px] text-danger">{error}</p>}
    </li>
  );
}
