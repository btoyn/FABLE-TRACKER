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
import { Sparkline } from "@/components/charts/sparkline";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

function Delta({ change, suffix }: { change: number; suffix: string }) {
  const flat = change === 0;
  const up = change > 0;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-semibold",
        flat ? "text-muted" : up ? "text-success" : "text-danger",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {flat ? "No change" : `${up ? "+" : "−"}${Math.abs(change)}%`}
      <span className="font-normal text-muted">{suffix}</span>
    </span>
  );
}

function CardShell({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("group block", className)}>
      <Card className="h-full transition-all duration-200 group-hover:-translate-y-[2px] group-hover:border-primary/25 group-hover:shadow-[var(--shadow-lift)] group-active:translate-y-0 group-active:shadow-[var(--shadow-card)]">
        {children}
      </Card>
    </Link>
  );
}

function Eyebrow({
  icon: Icon,
  label,
  right,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="inline-flex items-center gap-2 text-[13px] font-medium text-muted">
        <Icon className="h-4 w-4 text-primary/65" />
        {label}
      </span>
      {right}
    </div>
  );
}

export function KpiCards({
  coverage,
  meetings,
  loans,
  approvals,
}: {
  coverage: {
    pct: number;
    covered: number;
    active: number;
    change30: number | null;
    trend: number[];
  };
  meetings: { upcoming: number; nextLabel: string | null; awaitingNotes: number };
  loans: { activeLoans: number; updatedThisWeek: number; dueNow: number };
  approvals: { ytd: number; goal: number | null; amount: number };
}) {
  const loanPct = loans.activeLoans === 0 ? 100 : (loans.updatedThisWeek / loans.activeLoans) * 100;
  const approvalPct =
    approvals.goal && approvals.goal > 0
      ? Math.min(100, (approvals.ytd / approvals.goal) * 100)
      : 0;
  const coverageTone: ProgressTone =
    coverage.pct >= 75 ? "success" : coverage.pct >= 45 ? "primary" : "warning";

  return (
    <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-[1.15fr_1.15fr_0.9fr]">
      {/* ---- Large: personal coverage ---- */}
      <CardShell href="/lenders?view=needs_contact">
        <CardContent className="flex h-full flex-col p-5">
          <Eyebrow
            icon={HeartHandshake}
            label="Personal coverage"
            right={
              coverage.change30 !== null ? (
                <Delta change={coverage.change30} suffix="vs 30 days ago" />
              ) : undefined
            }
          />

          <p className="mt-3 text-[34px] font-bold leading-none tracking-[-0.02em] tabular-nums">
            {coverage.pct}%
          </p>

          {coverage.trend.length >= 2 ? (
            <div className="mt-3.5">
              <Sparkline
                values={coverage.trend}
                className="h-11 w-full"
                label="Personal coverage over the last eight weeks"
              />
              <p className="mt-1 text-[11.5px] font-medium uppercase tracking-[0.07em] text-muted/80">
                Last 8 weeks
              </p>
            </div>
          ) : (
            <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
              The 8-week trend appears once you have a couple of weeks of activity logged.
            </p>
          )}

          <div className="mt-auto pt-4">
            <ProgressBar
              value={coverage.pct}
              tone={coverageTone}
              className="mb-2.5"
              label="Personal coverage"
            />
            <p className="text-[13px] text-muted">
              <span className="font-semibold text-foreground">
                {coverage.covered} of {coverage.active}
              </span>{" "}
              lenders have a personal touch
            </p>
          </div>
        </CardContent>
      </CardShell>

      {/* ---- Large: weekly loan communication ---- */}
      <CardShell href="/follow-ups">
        <CardContent className="flex h-full flex-col p-5">
          <Eyebrow
            icon={MessageSquareDot}
            label="Weekly loan communication"
            right={
              loans.dueNow > 0 ? (
                <span className="rounded-full bg-warning-soft px-2.5 py-[3px] text-xs font-semibold text-warning">
                  {loans.dueNow} due now
                </span>
              ) : loans.activeLoans > 0 ? (
                <span className="rounded-full bg-success-soft px-2.5 py-[3px] text-xs font-semibold text-success">
                  All current
                </span>
              ) : undefined
            }
          />

          <p className="mt-3.5 text-[34px] font-bold leading-none tracking-[-0.02em] tabular-nums">
            {loans.activeLoans === 0 ? "—" : `${loans.updatedThisWeek}/${loans.activeLoans}`}
          </p>
          <p className="mt-1.5 text-[13px] text-muted">active loans updated this week</p>

          <div className="mt-auto pt-4">
            {loans.activeLoans > 0 && (
              <ProgressBar
                value={loanPct}
                tone={loans.dueNow > 0 ? "primary" : "success"}
                className="mb-2.5"
                label="Loans updated this week"
              />
            )}
            <p className="text-[13px] leading-relaxed text-muted">
              {loans.activeLoans === 0
                ? "No active loans tracked right now."
                : loans.dueNow > 0
                  ? `${loans.dueNow} update${loans.dueNow === 1 ? "" : "s"} due now — every loan gets a weekly touch, even when nothing changed.`
                  : "Every active loan has had its weekly touch."}
            </p>
          </div>
        </CardContent>
      </CardShell>

      {/* ---- Small pair, stacked on wide screens ---- */}
      <div className="grid gap-4 sm:grid-cols-2 md:col-span-2 xl:col-span-1 xl:grid-cols-1">
        <CardShell href="/lenders?view=upcoming_meetings">
          <CardContent className="flex h-full flex-col p-[18px]">
            <Eyebrow icon={CalendarDays} label="Meetings" />
            <p className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-[26px] font-bold leading-none tracking-[-0.02em] tabular-nums">
                {meetings.upcoming}
              </span>
              <span className="text-[13px] font-medium text-muted">confirmed</span>
            </p>
            <p className="mt-auto pt-2.5 text-[12.5px] leading-relaxed text-muted">
              {meetings.upcoming === 0 ? (
                "Nothing booked — scheduling one covers that lender right away."
              ) : (
                <>
                  Next {meetings.nextLabel}
                  {meetings.awaitingNotes > 0 && ` · ${meetings.awaitingNotes} awaiting notes`}
                </>
              )}
            </p>
          </CardContent>
        </CardShell>

        <CardShell href="/lenders?view=active_loans">
          <CardContent className="flex h-full flex-col p-[18px]">
            <Eyebrow icon={BadgeCheck} label="Annual SBA approvals" />
            <p className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-[26px] font-bold leading-none tracking-[-0.02em] tabular-nums">
                {approvals.ytd}
              </span>
              <span className="text-[13px] font-medium text-muted">
                {approvals.goal ? `of ${approvals.goal}` : "this year"}
              </span>
            </p>
            <div className="mt-auto pt-2.5">
              {approvals.goal ? (
                <ProgressBar
                  value={approvalPct}
                  tone={approvalPct >= 75 ? "success" : "primary"}
                  className="mb-2 h-1"
                  label="Approvals against goal"
                />
              ) : null}
              <p className="text-[12.5px] leading-relaxed text-muted">
                {approvals.amount > 0 ? `${formatCurrency(approvals.amount)} approved` : "None yet"}
                {approvals.goal
                  ? ` · ${Math.max(0, approvals.goal - approvals.ytd)} to go`
                  : " · set a goal to track pace"}
              </p>
            </div>
          </CardContent>
        </CardShell>
      </div>
    </div>
  );
}
