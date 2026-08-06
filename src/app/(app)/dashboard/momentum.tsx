import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Sparkline } from "@/components/charts/sparkline";
import { formatCurrency, cn } from "@/lib/utils";

/**
 * Relationship Momentum — one composed surface rather than four floating cards.
 * Each zone owns a semantic color: royal blue for relationship activity, gold
 * for pending work, teal for confirmed and healthy, navy for the annual goal.
 */

export interface MomentumProps {
  coverage: {
    pct: number;
    covered: number;
    active: number;
    change30: number | null;
    trend: number[];
  };
  loans: { activeLoans: number; updatedThisWeek: number; dueNow: number };
  meetings: { upcoming: number; nextLabel: string | null; awaitingNotes: number };
  approvals: { ytd: number; goal: number | null; amount: number };
}

/** Faint alpine contour texture. Decorative, 3% opacity, stretches to fill. */
function ContourTexture() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.03]"
      viewBox="0 0 1200 260"
      preserveAspectRatio="none"
      fill="none"
    >
      {[0, 26, 52, 78, 104, 130, 156, 182, 208].map((offset, i) => (
        <path
          key={offset}
          d={`M-40 ${210 - offset} C 140 ${180 - offset}, 250 ${236 - offset}, 430 ${204 - offset} S 700 ${150 - offset}, 880 ${188 - offset} S 1120 ${226 - offset}, 1240 ${172 - offset}`}
          stroke="#1a2f63"
          strokeWidth={i % 3 === 0 ? 1.6 : 1}
        />
      ))}
    </svg>
  );
}

function ZoneLabel({ children, tone }: { children: React.ReactNode; tone: string }) {
  return <p className={cn("eyebrow", tone)}>{children}</p>;
}

function Delta({ change }: { change: number }) {
  const flat = change === 0;
  const up = change > 0;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
        flat ? "bg-black/[0.04] text-muted" : up ? "bg-teal-soft text-teal" : "bg-danger-soft text-danger",
      )}
    >
      <Icon className="h-3 w-3" />
      {flat ? "flat" : `${up ? "+" : "−"}${Math.abs(change)}`}
    </span>
  );
}

/** Compact per-loan pips — a summary you can count, not a thin bar. */
function LoanPips({ total, updated }: { total: number; updated: number }) {
  if (total === 0 || total > 12) return null;
  return (
    <div className="flex flex-wrap items-center gap-1" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-2 w-5 rounded-full",
            i < updated ? "bg-teal" : "bg-gold/45 ring-1 ring-inset ring-gold/40",
          )}
        />
      ))}
    </div>
  );
}

const ZONE_BORDERS = [
  "",
  "border-t border-border sm:border-t-0 sm:border-l",
  "border-t border-border xl:border-t-0 xl:border-l",
  "border-t border-border sm:border-l xl:border-t-0",
];

export function RelationshipMomentum({ coverage, loans, meetings, approvals }: MomentumProps) {
  const loanTone = loans.dueNow > 0 ? "text-gold" : "text-teal";
  const approvalPct =
    approvals.goal && approvals.goal > 0
      ? Math.min(100, (approvals.ytd / approvals.goal) * 100)
      : 0;

  const zones = [
    /* ---- A. Personal coverage — royal blue, the relationship number ---- */
    <>
      <div className="flex items-center justify-between gap-2">
        <ZoneLabel tone="text-primary">Personal coverage</ZoneLabel>
        {coverage.change30 !== null && <Delta change={coverage.change30} />}
      </div>
      <p className="mt-2.5 text-[38px] font-bold leading-none tracking-[-0.03em] text-primary tabular-nums">
        {coverage.pct}
        <span className="text-[22px] font-semibold">%</span>
      </p>
      <p className="mt-1.5 text-[13px] text-muted">
        <span className="font-semibold text-foreground">
          {coverage.covered} of {coverage.active}
        </span>{" "}
        lenders
      </p>
      <div className="mt-auto pt-4">
        {coverage.trend.length >= 2 ? (
          <>
            <Sparkline values={coverage.trend} className="h-8 w-full" label="Coverage trend" />
            <p className="mt-1 text-[10.5px] font-medium uppercase tracking-[0.09em] text-muted/75">
              Last 8 weeks
            </p>
          </>
        ) : (
          /* No history yet: a segmented meter still reads at a glance. */
          <>
            <div className="flex gap-1" aria-hidden="true">
              {Array.from({ length: 10 }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 flex-1 rounded-full",
                    i < Math.round(coverage.pct / 10) ? "bg-primary" : "bg-primary/12",
                  )}
                />
              ))}
            </div>
            <p className="mt-1 text-[10.5px] font-medium uppercase tracking-[0.09em] text-muted/75">
              Trend builds over 8 weeks
            </p>
          </>
        )}
      </div>
    </>,

    /* ---- B. Weekly loan communication — gold when due, teal when current ---- */
    <>
      <ZoneLabel tone={loans.dueNow > 0 ? "text-gold" : "text-teal"}>Loan communication</ZoneLabel>
      <p className={cn("mt-2.5 text-[38px] font-bold leading-none tracking-[-0.03em] tabular-nums", loanTone)}>
        {loans.activeLoans === 0 ? "—" : loans.updatedThisWeek}
        {loans.activeLoans > 0 && (
          <span className="text-[22px] font-semibold text-muted">/{loans.activeLoans}</span>
        )}
      </p>
      <p className="mt-1.5 text-[13px] text-muted">
        {loans.activeLoans === 0 ? "No active loans" : "touched this week"}
      </p>
      <div className="mt-auto pt-4">
        <LoanPips total={loans.activeLoans} updated={loans.updatedThisWeek} />
        <p
          className={cn(
            "mt-2 text-[11.5px] font-semibold",
            loans.dueNow > 0 ? "text-gold" : "text-teal",
          )}
        >
          {loans.activeLoans === 0
            ? "Nothing to chase"
            : loans.dueNow > 0
              ? `${loans.dueNow} due now`
              : "All current"}
        </p>
      </div>
    </>,

    /* ---- C. Meetings — teal, because a booked meeting is coverage banked ---- */
    <>
      <ZoneLabel tone="text-teal">Meetings</ZoneLabel>
      <p className="mt-2.5 text-[38px] font-bold leading-none tracking-[-0.03em] text-teal tabular-nums">
        {meetings.upcoming}
      </p>
      <p className="mt-1.5 text-[13px] text-muted">
        {meetings.upcoming === 1 ? "confirmed ahead" : "confirmed ahead"}
      </p>
      <div className="mt-auto pt-4">
        {meetings.upcoming === 0 ? (
          <p className="text-[12px] leading-relaxed text-muted">
            Booking one covers that lender immediately.
          </p>
        ) : (
          <>
            <p className="text-[12.5px] font-semibold text-foreground">{meetings.nextLabel}</p>
            <p className="mt-0.5 text-[11.5px] text-muted">
              {meetings.awaitingNotes > 0
                ? `${meetings.awaitingNotes} awaiting notes`
                : "Notes all captured"}
            </p>
          </>
        )}
      </div>
    </>,

    /* ---- D. Annual SBA approvals — navy value against a teal goal bar ---- */
    <>
      <ZoneLabel tone="text-navy">SBA approvals</ZoneLabel>
      <p className="mt-2.5 text-[38px] font-bold leading-none tracking-[-0.03em] text-navy tabular-nums">
        {approvals.ytd}
        {approvals.goal && (
          <span className="text-[22px] font-semibold text-muted">/{approvals.goal}</span>
        )}
      </p>
      <p className="mt-1.5 text-[13px] text-muted">
        {approvals.amount > 0 ? `${formatCurrency(approvals.amount)} approved` : "none yet this year"}
      </p>
      <div className="mt-auto pt-4">
        {approvals.goal ? (
          <>
            <div className="h-1 w-full overflow-hidden rounded-full bg-navy/10">
              <div
                className="h-full rounded-full bg-teal transition-[width] duration-500"
                style={{ width: `${approvalPct}%` }}
              />
            </div>
            <p className="mt-2 text-[11.5px] font-semibold text-navy/75">
              {Math.max(0, approvals.goal - approvals.ytd)} to go
            </p>
          </>
        ) : (
          <p className="text-[12px] leading-relaxed text-muted">
            Set an annual goal to track pace.
          </p>
        )}
      </div>
    </>,
  ];

  const hrefs = [
    "/lenders?view=needs_contact",
    "/follow-ups",
    "/lenders?view=upcoming_meetings",
    "/lenders?view=active_loans",
  ];

  return (
    <section className="mb-5">
      <div className="relative overflow-hidden rounded-[20px] border border-border bg-[linear-gradient(168deg,#eff3fb_0%,#f8fafd_46%,#fdfdff_100%)] shadow-[var(--shadow-card),var(--shadow-inset)]">
        <ContourTexture />
        {/* Warm sunrise glow, carried down from the hero */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(680px 260px at 88% -12%, rgba(200,141,32,0.13) 0%, rgba(200,141,32,0.05) 42%, rgba(200,141,32,0) 72%)",
          }}
        />

        <div className="relative">
          <div className="flex items-baseline justify-between gap-3 px-5 pt-4 sm:px-6">
            <h2 className="eyebrow text-navy/70">Relationship momentum</h2>
            <span className="text-[11.5px] text-muted">rolling 30-day goal</span>
          </div>

          <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            {zones.map((zone, i) => (
              <Link
                key={hrefs[i]}
                href={hrefs[i]}
                className={cn(
                  "group flex min-h-[168px] flex-col p-5 transition-colors sm:p-6 hover:bg-white/70",
                  ZONE_BORDERS[i],
                )}
              >
                {zone}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
