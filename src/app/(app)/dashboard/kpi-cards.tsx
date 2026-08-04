import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  HeartHandshake,
  Minus,
  MessageSquareDot,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressBar, type ProgressTone } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";

function Trend({ change, unit = "pts" }: { change: number | null; unit?: string }) {
  if (change === null) return null;
  const flat = change === 0;
  const up = change > 0;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  const tone = flat ? "text-muted" : up ? "text-success" : "text-danger";
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${tone}`}>
      <Icon className="h-3.5 w-3.5" />
      {flat ? "no change" : `${Math.abs(change)} ${unit}`}
    </span>
  );
}

function KpiCard({
  href,
  icon: Icon,
  label,
  value,
  valueSuffix,
  context,
  progress,
  tone = "primary",
  trend,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  valueSuffix?: string;
  context: React.ReactNode;
  progress?: number;
  tone?: ProgressTone;
  trend?: React.ReactNode;
}) {
  return (
    <Link href={href} className="group block">
      <Card className="h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/25 group-hover:shadow-[0_4px_14px_rgba(16,24,40,0.08)] group-active:translate-y-0">
        <CardContent className="flex h-full flex-col p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 text-[13px] font-medium text-muted">
              <Icon className="h-4 w-4 text-primary/70" />
              {label}
            </span>
            {trend}
          </div>

          <p className="mt-3 flex items-baseline gap-1.5">
            <span className="text-[28px] font-semibold leading-none tracking-tight tabular-nums">
              {value}
            </span>
            {valueSuffix && (
              <span className="text-sm font-medium text-muted">{valueSuffix}</span>
            )}
          </p>

          <div className="mt-auto pt-3">
            {progress !== undefined && (
              <ProgressBar value={progress} tone={tone} className="mb-2" label={label} />
            )}
            <p className="text-xs leading-relaxed text-muted">{context}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function KpiCards({
  coverage,
  meetings,
  loans,
  approvals,
}: {
  coverage: { pct: number; covered: number; active: number; changeFromPrevious: number | null };
  meetings: { upcoming: number; nextLabel: string | null; awaitingNotes: number };
  loans: { activeLoans: number; updatedThisWeek: number; dueNow: number };
  approvals: { ytd: number; goal: number | null; amount: number };
}) {
  const loanPct =
    loans.activeLoans === 0 ? 100 : (loans.updatedThisWeek / loans.activeLoans) * 100;
  const approvalPct =
    approvals.goal && approvals.goal > 0 ? (approvals.ytd / approvals.goal) * 100 : 0;

  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        href="/lenders?view=needs_contact"
        icon={HeartHandshake}
        label="Personal coverage"
        value={`${coverage.pct}%`}
        context={
          <>
            {coverage.covered} of {coverage.active} active lenders have a one-to-one touch inside the
            goal window.
          </>
        }
        progress={coverage.pct}
        tone={coverage.pct >= 75 ? "success" : coverage.pct >= 50 ? "primary" : "warning"}
        trend={<Trend change={coverage.changeFromPrevious} />}
      />

      <KpiCard
        href="/lenders?view=upcoming_meetings"
        icon={CalendarDays}
        label="Meetings"
        value={String(meetings.upcoming)}
        valueSuffix="confirmed"
        context={
          meetings.upcoming === 0 ? (
            <>Nothing on the calendar yet — scheduling one counts as coverage right away.</>
          ) : (
            <>
              Next up {meetings.nextLabel}.
              {meetings.awaitingNotes > 0 && ` ${meetings.awaitingNotes} awaiting notes.`}
            </>
          )
        }
      />

      <KpiCard
        href="/follow-ups"
        icon={MessageSquareDot}
        label="Weekly loan communication"
        value={
          loans.activeLoans === 0 ? "—" : `${loans.updatedThisWeek}/${loans.activeLoans}`
        }
        context={
          loans.activeLoans === 0 ? (
            <>No active loans being tracked right now.</>
          ) : loans.dueNow > 0 ? (
            <>
              {loans.dueNow} update{loans.dueNow === 1 ? "" : "s"} due now — every active loan gets a
              weekly touch, even when nothing changed.
            </>
          ) : (
            <>Every active loan has had its weekly touch. Nothing due.</>
          )
        }
        progress={loans.activeLoans === 0 ? undefined : loanPct}
        tone={loans.dueNow > 0 ? "warning" : "success"}
      />

      <KpiCard
        href="/lenders?view=active_loans"
        icon={BadgeCheck}
        label="Annual SBA approvals"
        value={String(approvals.ytd)}
        valueSuffix={approvals.goal ? `of ${approvals.goal}` : "this year"}
        context={
          <>
            {approvals.amount > 0
              ? `${formatCurrency(approvals.amount)} approved year to date.`
              : "No approvals recorded yet this year."}
            {approvals.goal
              ? ` ${Math.max(0, approvals.goal - approvals.ytd)} to go.`
              : " Set an annual goal to track pace."}
          </>
        }
        progress={approvals.goal ? approvalPct : undefined}
        tone={approvalPct >= 75 ? "success" : "primary"}
      />
    </div>
  );
}
