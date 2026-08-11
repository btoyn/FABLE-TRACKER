import { createClient } from "@/lib/supabase/server";
import { ensureSampleData, getLendersWithCoverage, getQuickLogLenders } from "@/lib/data";
import {
  getLoanStatuses,
  getRelationshipContext,
  getUpcoming,
  weekStartOf,
} from "@/lib/dashboard";
import { getRelationshipHealth } from "@/lib/health";
import { getFlags } from "@/lib/flags";
import { formatDateTime } from "@/lib/utils";
import { MEETING_TYPE_LABELS } from "@/lib/labels";
import { DashboardHeader } from "./dashboard-header";
import { MetricCards } from "./metric-cards";
import { RelationshipHealthWidget } from "./health-widget";
import { TodayRibbon, type RibbonData } from "./today-ribbon";
import {
  RelationshipRows,
  type PrimaryActionKind,
  type ReasonChip,
  type RelationshipRow,
} from "./relationship-rows";
import { AgendaRail } from "./agenda-rail";
import type { AvatarStatus } from "@/components/ui/avatar";

/** Referral stages that count as "qualified" — past initial inquiry, and not
 *  dormant / closed without handoff. */
const QUALIFIED_OPPORTUNITY_STAGES = [
  "sources_uses_sent",
  "needs_list_sent",
  "documents_pending",
  "ready_for_preflight",
  "handed_off",
];

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

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default async function DashboardPage() {
  await ensureSampleData();

  const supabase = await createClient();
  const now = new Date();
  const nowMs = now.getTime();
  const today = now.toISOString().slice(0, 10);
  const weekStart = weekStartOf(now);

  // Current-calendar-month boundaries for the "this month" metrics.
  const monthStartIso = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const nextMonthIso = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
  const monthStartDate = monthStartIso.slice(0, 10);
  const nextMonthDate = nextMonthIso.slice(0, 10);

  const [
    lenders,
    { data: profile },
    { data: missingNotes },
    { data: overduePromises },
    { data: plan },
    upcoming,
    loanStatuses,
    context,
    quickLog,
    health,
    { count: meetingsThisMonth },
    { count: referralsReceived },
    { data: qualifiedOpps },
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
      .select("id, description, due_at, direction, lender:lenders(id, full_name)")
      .eq("status", "open")
      .lt("due_at", today)
      .is("deleted_at", null)
      .order("due_at"),
    supabase
      .from("weekly_relationship_plans")
      .select("id")
      .eq("week_start", weekStart)
      .maybeSingle(),
    getUpcoming(),
    getLoanStatuses(),
    getRelationshipContext(),
    getQuickLogLenders(),
    getRelationshipHealth(),
    // Metric 3 — meetings whose start falls inside the current calendar month.
    supabase
      .from("meetings")
      .select("id", { count: "exact", head: true })
      .gte("start_at", monthStartIso)
      .lt("start_at", nextMonthIso)
      .is("deleted_at", null),
    // Metric 4 — referral opportunities received this month.
    supabase
      .from("opportunities")
      .select("id", { count: "exact", head: true })
      .gte("received_at", monthStartDate)
      .lt("received_at", nextMonthDate)
      .is("deleted_at", null),
    // Metric 5 — source lenders behind at least one qualified referral.
    supabase
      .from("opportunities")
      .select("lender_id")
      .in("stage", QUALIFIED_OPPORTUNITY_STAGES)
      .not("lender_id", "is", null)
      .is("deleted_at", null),
  ]);

  // ---- Coverage ------------------------------------------------------------
  const active = lenders.filter((l) => l.active);
  // Metric 1 — active lenders currently within contact cadence.
  const personalCovered = active.filter((l) => l.coverage.personal === "on_track").length;
  // Metric 2 — active lenders past their next-contact date.
  const needingAttention = active.filter((l) =>
    ["overdue", "seriously_overdue", "never_contacted"].includes(l.coverage.personal),
  ).length;
  // Metric 5 — distinct source lenders across qualified referrals.
  const partnersProducing = new Set(
    (qualifiedOpps ?? []).map((o) => o.lender_id).filter((id): id is string => Boolean(id)),
  ).size;

  // ---- This week's plan ----------------------------------------------------
  const planItemsResult = plan
    ? await supabase
        .from("weekly_relationship_plan_items")
        .select(
          "id, rank, status, recommended_action, lender:lenders(id, full_name, first_name, email, mobile_phone, territory, relationship_tier, preferred_contact_method, institution:institutions(name))",
        )
        .eq("plan_id", plan.id)
        .eq("list_type", "top")
        .order("rank")
    : null;

  const coverageById = new Map(lenders.map((l) => [l.id, l.coverage]));
  const topItems = planItemsResult?.data ?? [];
  const completedCount = topItems.filter((i) => i.status === "completed").length;

  const relationshipRows: RelationshipRow[] = topItems
    .filter((i) => i.status === "open")
    .map((item) => {
      const lender = item.lender as unknown as {
        id: string;
        full_name: string;
        first_name: string;
        email: string | null;
        mobile_phone: string | null;
        territory: string | null;
        relationship_tier: string;
        preferred_contact_method: string | null;
        institution: { name: string } | null;
      } | null;
      if (!lender) return null;

      const coverage = coverageById.get(lender.id);
      const days = coverage?.daysSincePersonal ?? null;
      const personal = coverage?.personal ?? "never_contacted";
      const hasLoan = context.activeLoanLenders.has(lender.id);
      const hasFollowUp = context.openFollowUpLenders.has(lender.id);
      const hasTopic = context.personalTopicLenders.has(lender.id);
      const isInbound = context.recentInboundLenders.has(lender.id);
      const nearTrip =
        context.tripTerritory !== null && lender.territory === context.tripTerritory;

      // The avatar dot and the left rail share one status, worst signal first.
      const status: AvatarStatus =
        personal === "overdue" ||
        personal === "seriously_overdue" ||
        personal === "never_contacted"
          ? "overdue"
          : personal === "grace"
            ? "grace"
            : isInbound
              ? "inbound"
              : lender.relationship_tier === "A"
                ? "priority"
                : "none";

      const chips: ReasonChip[] = [
        days === null
          ? { label: "No personal contact yet", tone: "red" as const }
          : {
              label: `${days} days since contact`,
              tone:
                personal === "overdue" || personal === "seriously_overdue"
                  ? ("red" as const)
                  : personal === "grace"
                    ? ("gold" as const)
                    : ("slate" as const),
            },
        hasFollowUp && { label: "Open follow-up", tone: "gold" as const },
        hasLoan && { label: "Active loan", tone: "blue" as const },
        nearTrip && { label: "Near upcoming trip", tone: "teal" as const },
        hasTopic && { label: "Personal topic available", tone: "plum" as const },
        isInbound && { label: "They reached out", tone: "teal" as const },
      ].filter(Boolean) as ReasonChip[];

      const primary: PrimaryActionKind = hasLoan
        ? "draft_update"
        : hasFollowUp
          ? "log_followup"
          : lender.preferred_contact_method === "in_person"
            ? "invite_lunch"
            : "draft_checkin";

      return {
        itemId: item.id,
        lenderId: lender.id,
        name: lender.full_name,
        firstName: lender.first_name,
        institution: lender.institution?.name ?? null,
        territory: lender.territory,
        email: lender.email,
        mobile: lender.mobile_phone,
        status,
        chips: chips.slice(0, 4),
        suggestion: item.recommended_action ?? "Send a short personal check-in",
        primary,
      };
    })
    .filter((r): r is RelationshipRow => r !== null);

  // ---- Today ribbon --------------------------------------------------------
  const promises = overduePromises ?? [];
  const worstDaysLate = promises.reduce((worst, p) => {
    if (!p.due_at) return worst;
    return Math.max(worst, Math.floor((nowMs - new Date(p.due_at).getTime()) / 86_400_000));
  }, 0);

  const dueLoans = loanStatuses.filter((l) => l.state !== "updated");

  const ribbon: RibbonData = {
    notes: (missingNotes ?? []).map((m) => ({
      id: m.id,
      title: m.title,
      when: `${MEETING_TYPE_LABELS[m.meeting_type] ?? m.meeting_type} · ${formatDateTime(m.start_at)}`,
    })),
    promises: { count: promises.length, worstDaysLate },
    loansDue: dueLoans.map((l) => ({
      id: l.id,
      borrower: l.borrower,
      detail: [l.lenderName, l.daysLate > 0 ? `${l.daysLate}d late` : "due now"]
        .filter(Boolean)
        .join(" · "),
      overdue: l.state === "overdue",
    })),
  };

  // ---- Header summary ------------------------------------------------------
  const noteCount = (missingNotes ?? []).length;
  const openItems = promises.length + dueLoans.length + noteCount;
  const summary =
    openItems === 0
      ? relationshipRows.length > 0
        ? `Nothing overdue. ${relationshipRows.length} relationships are waiting on a first move.`
        : "Nothing overdue and nobody slipping. You're clear."
      : `${plural(openItems, "item")} need${openItems === 1 ? "s" : ""} you today${
          noteCount > 0 ? `, including ${plural(noteCount, "meeting note")} to capture` : ""
        }.`;

  return (
    <>
      <DashboardHeader
        greeting={greeting()}
        firstName={profile?.display_name?.split(" ")[0] ?? null}
        summary={summary}
        aiEnabled={getFlags().ai}
        quickLog={quickLog}
      />

      <div className="flex flex-col gap-5">
        <MetricCards
          activeRelationships={personalCovered}
          needingAttention={needingAttention}
          meetingsThisMonth={meetingsThisMonth ?? 0}
          referralsReceived={referralsReceived ?? 0}
          partnersProducing={partnersProducing}
        />

        {/* Phones lead with today's operational work. */}
        <div className="order-1 xl:order-none">
          <TodayRibbon data={ribbon} />
        </div>

        <div className="order-2 grid gap-5 xl:order-none xl:grid-cols-[minmax(0,1fr)_344px]">
          <RelationshipRows
            rows={relationshipRows}
            completed={completedCount}
            total={topItems.length}
            hasPlan={Boolean(plan)}
          />
          <div className="flex min-w-0 flex-col gap-5 xl:sticky xl:top-6 xl:self-start">
            <RelationshipHealthWidget health={health} />
            <AgendaRail data={upcoming} />
          </div>
        </div>
      </div>
    </>
  );
}
