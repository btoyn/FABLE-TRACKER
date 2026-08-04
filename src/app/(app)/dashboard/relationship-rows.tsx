"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CalendarPlus,
  Mail,
  MapPin,
  MessageSquare,
  RefreshCw,
  Building2,
  Clock3,
  Lightbulb,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Select } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress";
import { MEETING_TYPE_LABELS } from "@/lib/labels";
import { logActivity } from "../activity-actions";
import { replacePlanItem, scheduleTentativeMeeting } from "./actions";

export interface RelationshipRow {
  itemId: string;
  lenderId: string;
  name: string;
  firstName: string;
  institution: string | null;
  territory: string | null;
  email: string | null;
  mobile: string | null;
  daysSincePersonal: number | null;
  contactPhrase: string;
  reason: string;
  suggestedAction: string;
  urgent: boolean;
}

const VISIBLE = 5;

export function RelationshipRows({
  rows,
  completed,
  total,
  hasPlan,
}: {
  rows: RelationshipRow[];
  completed: number;
  total: number;
  hasPlan: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? rows : rows.slice(0, VISIBLE);
  const pct = total === 0 ? 0 : (completed / total) * 100;

  return (
    <Card id="this-week">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-[17px]">This week&apos;s relationships</CardTitle>
            <CardDescription>
              Chosen by who&apos;s slipping furthest, worst first. Reaching out ticks them off
              automatically.
            </CardDescription>
          </div>
          <div className="w-full max-w-[190px] shrink-0">
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-xs font-medium text-muted">This week</span>
              <span className="text-xs font-semibold tabular-nums">
                {completed}/{total}
              </span>
            </div>
            <ProgressBar
              value={pct}
              tone={pct >= 100 ? "success" : "primary"}
              label="Weekly outreach completion"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {rows.length === 0 ? (
          <EmptyState
            title={hasPlan ? "Everyone on this week's list is done" : "No weekly plan yet"}
            description={
              hasPlan
                ? "Nice work. The list rebuilds at the start of next week."
                : "Use “Start weekly outreach” above and the plan builds itself from your coverage."
            }
            className="py-10"
          />
        ) : (
          <>
            <ul className="divide-y divide-border">
              {visible.map((row) => (
                <Row key={row.itemId} row={row} />
              ))}
            </ul>

            {rows.length > VISIBLE && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
                <Button variant="secondary" size="sm" onClick={() => setShowAll((v) => !v)}>
                  {showAll ? "Show top 5" : `View all ${rows.length}`}
                </Button>
                <Link
                  href="/needs-attention"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Full needs-attention queue →
                </Link>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ row }: { row: RelationshipRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [panel, setPanel] = useState<"none" | "schedule" | "logEmail" | "logText">("none");
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<{ error?: string } | void>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      setPanel("none");
      router.refresh();
    });
  }

  const mailto = row.email
    ? `mailto:${row.email}?subject=${encodeURIComponent("Checking in")}`
    : null;
  const sms = row.mobile ? `sms:${row.mobile.replace(/[^\d+]/g, "")}` : null;

  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        <Avatar name={row.name} size="lg" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              href={`/lenders/${row.lenderId}`}
              className="text-[15px] font-semibold leading-tight hover:text-primary"
            >
              {row.name}
            </Link>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                row.urgent ? "bg-danger-soft text-danger" : "bg-black/5 text-muted"
              }`}
            >
              <Clock3 className="h-3 w-3" />
              {row.contactPhrase}
            </span>
          </div>

          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
            {row.institution && (
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {row.institution}
              </span>
            )}
            {row.territory && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {row.territory}
              </span>
            )}
          </p>

          <p className="mt-2 text-sm leading-snug text-foreground/80">
            <span className="font-medium text-foreground">Why now:</span> {row.reason}
          </p>
          <p className="mt-1 inline-flex items-start gap-1.5 rounded-lg bg-primary-soft px-2.5 py-1.5 text-sm leading-snug text-primary">
            <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {row.suggestedAction}
          </p>

          {/* Actions */}
          <div className="mt-3 flex flex-wrap gap-2">
            {mailto ? (
              <a
                href={mailto}
                onClick={() => setPanel("logEmail")}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-medium transition-colors hover:border-primary/30 hover:bg-primary-soft active:bg-primary-soft/80"
              >
                <Mail className="h-3.5 w-3.5" /> Draft email
              </a>
            ) : (
              <Button size="sm" variant="secondary" disabled title="No email address on file">
                <Mail className="h-3.5 w-3.5" /> Draft email
              </Button>
            )}

            {sms ? (
              <a
                href={sms}
                onClick={() => setPanel("logText")}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-medium transition-colors hover:border-primary/30 hover:bg-primary-soft active:bg-primary-soft/80"
              >
                <MessageSquare className="h-3.5 w-3.5" /> Text
              </a>
            ) : (
              <Button size="sm" variant="secondary" disabled title="No mobile number on file">
                <MessageSquare className="h-3.5 w-3.5" /> Text
              </Button>
            )}

            <Button
              size="sm"
              variant="secondary"
              onClick={() => setPanel(panel === "schedule" ? "none" : "schedule")}
            >
              <CalendarPlus className="h-3.5 w-3.5" /> Schedule
            </Button>

            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              title="Swap in the next lender on deck"
              onClick={() => run(() => replacePlanItem(row.itemId))}
            >
              <RefreshCw className="h-3.5 w-3.5" /> Replace
            </Button>
          </div>

          {/* Log-after-send prompts: we can't observe the send, so we ask (§20). */}
          {(panel === "logEmail" || panel === "logText") && (
            <form
              className="mt-3 space-y-2 rounded-xl border border-border bg-background p-3"
              onSubmit={(e) => {
                e.preventDefault();
                const summary = String(new FormData(e.currentTarget).get("summary") ?? "");
                run(() =>
                  logActivity({
                    lenderId: row.lenderId,
                    activityType: panel === "logEmail" ? "personal_email" : "text",
                    summary,
                  }),
                );
              }}
            >
              <p className="text-sm font-medium">
                Did it go out? Log it so {row.firstName} counts as covered.
              </p>
              <Input name="summary" placeholder="Quick summary (optional)" />
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={pending}>
                  {pending ? "Saving…" : "Log it"}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setPanel("none")}>
                  Not yet
                </Button>
              </div>
            </form>
          )}

          {panel === "schedule" && (
            <form
              className="mt-3 space-y-2.5 rounded-xl border border-border bg-background p-3"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                run(() =>
                  scheduleTentativeMeeting({
                    lenderId: row.lenderId,
                    meetingType: String(f.get("meetingType")),
                    startAt: String(f.get("startAt")),
                    locationName: String(f.get("location") ?? ""),
                  }),
                );
              }}
            >
              <p className="text-sm font-medium">
                Put a tentative hold on the calendar — it stays tentative until {row.firstName}{" "}
                replies.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <Label>Type</Label>
                  <Select name="meetingType" defaultValue="lunch">
                    {Object.entries(MEETING_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>When</Label>
                  <Input name="startAt" type="datetime-local" required />
                </div>
              </div>
              <div>
                <Label>Where (optional)</Label>
                <Input name="location" placeholder="e.g. Hearth on 25th" />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={pending}>
                  {pending ? "Saving…" : "Save hold"}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setPanel("none")}>
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        </div>
      </div>
    </li>
  );
}
