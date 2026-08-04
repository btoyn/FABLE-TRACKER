import Link from "next/link";
import { Plus, Upload, CheckSquare, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";
import { ensureSampleData, getLendersWithCoverage } from "@/lib/data";
import { formatDateTime, formatCurrency } from "@/lib/utils";
import { MEETING_TYPE_LABELS } from "@/lib/labels";
import { PromiseRowActions } from "../follow-ups/row-actions";

export const metadata = { title: "Dashboard" };

function greeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: "America/Denver",
    }).format(new Date()),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  await ensureSampleData();

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const nowIso = new Date().toISOString();
  const year = new Date().getFullYear();

  const [
    lenders,
    { data: profile },
    { data: missingNotes },
    { data: overduePromises },
    { data: loansDue },
    { data: upcomingMeetings },
    { data: planItems },
    { data: approvals },
    { data: goal },
  ] = await Promise.all([
    getLendersWithCoverage(),
    supabase.from("users").select("display_name").maybeSingle(),
    supabase
      .from("meetings")
      .select("id, title, start_at, meeting_type")
      .eq("notes_status", "pending")
      .is("deleted_at", null)
      .order("start_at", { ascending: false }),
    supabase
      .from("promises")
      .select("*, lender:lenders(id, full_name)")
      .eq("status", "open")
      .lt("due_at", today)
      .is("deleted_at", null)
      .order("due_at"),
    supabase
      .from("active_loans")
      .select("id, borrower_name, stage, next_update_due_at, lender:lenders(id, full_name)")
      .eq("updates_active", true)
      .lte("next_update_due_at", today)
      .is("deleted_at", null),
    supabase
      .from("meetings")
      .select("id, title, start_at, meeting_type, location_name, status")
      .eq("status", "confirmed")
      .gte("start_at", nowIso)
      .is("deleted_at", null)
      .order("start_at")
      .limit(5),
    supabase
      .from("weekly_relationship_plan_items")
      .select("*, lender:lenders(id, full_name, institution:institutions(name))")
      .eq("status", "open")
      .order("rank"),
    supabase
      .from("active_loans")
      .select("approved_sba_amount")
      .eq("stage", "sba_approved")
      .gte("sba_approval_date", `${year}-01-01`)
      .is("deleted_at", null),
    supabase.from("annual_goals").select("approval_goal").eq("year", year).maybeSingle(),
  ]);

  const active = lenders.filter((l) => l.active);
  const personalCovered = active.filter((l) => l.coverage.personal === "on_track").length;
  const visibleCovered = active.filter((l) => l.coverage.visible === "on_track").length;
  const overdueCount = active.filter((l) =>
    ["overdue", "seriously_overdue"].includes(l.coverage.personal),
  ).length;
  const needsAttention = active.filter((l) => l.coverage.personal !== "on_track").length;
  const pct = (n: number) => (active.length === 0 ? 0 : Math.round((n / active.length) * 100));

  const approvalsYtd = (approvals ?? []).length;
  const approvedAmount = (approvals ?? []).reduce(
    (sum, a) => sum + Number(a.approved_sba_amount ?? 0),
    0,
  );

  const top10 = (planItems ?? []).filter((i) => i.list_type === "top").slice(0, 10);
  const onDeck = (planItems ?? []).filter((i) => i.list_type === "on_deck").slice(0, 10);

  const summaryParts = [
    (overduePromises ?? []).length > 0 &&
      `${(overduePromises ?? []).length} promise${(overduePromises ?? []).length === 1 ? " is" : "s are"} overdue`,
    (loansDue ?? []).length > 0 &&
      `${(loansDue ?? []).length} loan update${(loansDue ?? []).length === 1 ? " is" : "s are"} due`,
    needsAttention > 0 && `${needsAttention} lenders need attention`,
  ].filter(Boolean);

  return (
    <>
      {/* Header (spec §10) */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting()}
          {profile?.display_name ? `, ${profile.display_name.split(" ")[0]}` : ""}
        </h1>
        <p className="mt-1 text-muted">
          {summaryParts.length > 0 ? summaryParts.join(", ") + "." : "You're all caught up."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/lenders/new" className={buttonVariants({ variant: "primary", size: "sm" })}>
            <Plus className="h-4 w-4" /> Add lender
          </Link>
          <Link href="/lenders" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            <CheckSquare className="h-4 w-4" /> Log activity
          </Link>
          <Link href="/import" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            <Upload className="h-4 w-4" /> Import list
          </Link>
          <Link
            href="/needs-attention"
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            <AlertCircle className="h-4 w-4" /> Needs attention
          </Link>
        </div>
      </div>

      {/* Core cards — every one clickable (spec §10) */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <MetricCard href="/lenders" label="Personal coverage" value={`${pct(personalCovered)}%`} />
        <MetricCard href="/lenders" label="Overall coverage" value={`${pct(visibleCovered)}%`} />
        <MetricCard
          href="/needs-attention?f=overdue"
          label="Overdue relationships"
          value={String(overdueCount)}
          tone={overdueCount > 0 ? "danger" : "default"}
        />
        <MetricCard
          href="/lenders?view=upcoming_meetings"
          label="Meetings scheduled"
          value={String((upcomingMeetings ?? []).length)}
        />
        <MetricCard
          href="/follow-ups"
          label="Loan updates due"
          value={String((loansDue ?? []).length)}
          tone={(loansDue ?? []).length > 0 ? "warning" : "default"}
        />
        <MetricCard
          href="/lenders"
          label={`SBA approvals ${year}`}
          value={goal ? `${approvalsYtd} / ${goal.approval_goal}` : String(approvalsYtd)}
          sub={approvedAmount > 0 ? formatCurrency(approvedAmount) : undefined}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* 1. Missing meeting notes */}
        {(missingNotes ?? []).length > 0 && (
          <Card className="border-warning/40 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Missing meeting notes</CardTitle>
              <CardDescription>
                Capture these while they&apos;re fresh — they feed your follow-ups and briefs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border text-sm">
                {(missingNotes ?? []).map((m) => (
                  <li key={m.id} className="flex items-center justify-between py-2">
                    <span className="font-medium">{m.title}</span>
                    <span className="text-muted">
                      {MEETING_TYPE_LABELS[m.meeting_type]} · {formatDateTime(m.start_at)}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* 2. Overdue promises */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Overdue promises</CardTitle>
          </CardHeader>
          <CardContent>
            {(overduePromises ?? []).length === 0 ? (
              <EmptyState title="No overdue promises" className="py-6" />
            ) : (
              <ul className="divide-y divide-border text-sm">
                {(overduePromises ?? []).map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 py-2">
                    <div className="min-w-0">
                      <p className="font-medium">{p.description}</p>
                      <p className="text-muted">
                        <Badge
                          variant={p.direction === "i_promised" ? "default" : "warning"}
                          className="mr-1.5"
                        >
                          {p.direction === "i_promised" ? "I promised" : "They promised"}
                        </Badge>
                        {(p.lender as unknown as { full_name: string } | null)?.full_name}
                      </p>
                    </div>
                    <PromiseRowActions promiseId={p.id} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* 3. Active-loan updates due */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Loan updates due</CardTitle>
            <CardDescription>Weekly touch on every active loan, even if nothing changed.</CardDescription>
          </CardHeader>
          <CardContent>
            {(loansDue ?? []).length === 0 ? (
              <EmptyState title="All loans updated this week" className="py-6" />
            ) : (
              <ul className="divide-y divide-border text-sm">
                {(loansDue ?? []).map((loan) => (
                  <li key={loan.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium">{loan.borrower_name}</p>
                      <p className="text-muted">
                        {loan.stage.replace(/_/g, " ")} ·{" "}
                        {(loan.lender as unknown as { full_name: string } | null)?.full_name}
                      </p>
                    </div>
                    <Badge variant="warning">update due</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* 5. Weekly Top 10 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">This week&apos;s relationships</CardTitle>
            <CardDescription>
              Top {top10.length} plus {onDeck.length} on deck.{" "}
              <Link href="/needs-attention" className="text-primary hover:underline">
                Full Needs Attention queue →
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {top10.length === 0 ? (
              <EmptyState
                title="No weekly plan yet"
                description="The weekly Top 10 generates once you have lenders and activity."
                className="py-6"
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                    Top 10
                  </p>
                  <PlanList items={top10} />
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                    On deck
                  </p>
                  <PlanList items={onDeck} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 6. Upcoming meetings */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Upcoming meetings</CardTitle>
          </CardHeader>
          <CardContent>
            {(upcomingMeetings ?? []).length === 0 ? (
              <EmptyState title="Nothing on the calendar yet" className="py-6" />
            ) : (
              <ul className="divide-y divide-border text-sm">
                {(upcomingMeetings ?? []).map((m) => (
                  <li key={m.id} className="flex items-center justify-between py-2">
                    <span className="font-medium">{m.title}</span>
                    <span className="text-muted">
                      {formatDateTime(m.start_at)}
                      {m.location_name ? ` · ${m.location_name}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function MetricCard({
  href,
  label,
  value,
  sub,
  tone = "default",
}: {
  href: string;
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "warning" | "danger";
}) {
  return (
    <Link href={href}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardContent className="p-4">
          <p
            className={`text-2xl font-semibold ${
              tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : ""
            }`}
          >
            {value}
          </p>
          <p className="mt-0.5 text-xs text-muted">{label}</p>
          {sub && <p className="text-xs text-muted">{sub}</p>}
        </CardContent>
      </Card>
    </Link>
  );
}

function PlanList({
  items,
}: {
  items: {
    id: string;
    rank: number;
    explanation: string | null;
    recommended_action: string | null;
    lender: unknown;
  }[];
}) {
  return (
    <ol className="space-y-1.5 text-sm">
      {items.map((item) => {
        const lender = item.lender as {
          id: string;
          full_name: string;
          institution: { name: string } | null;
        } | null;
        if (!lender) return null;
        return (
          <li key={item.id} className="flex items-baseline gap-2">
            <span className="w-5 shrink-0 text-right text-xs text-muted">{item.rank}.</span>
            <div className="min-w-0">
              <Link href={`/lenders/${lender.id}`} className="font-medium hover:text-primary">
                {lender.full_name}
              </Link>
              <span className="text-muted"> · {lender.institution?.name}</span>
              {item.recommended_action && (
                <p className="truncate text-xs text-muted">{item.recommended_action}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
