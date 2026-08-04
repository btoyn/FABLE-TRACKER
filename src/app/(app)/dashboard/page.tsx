import { StatusSegments } from "@/components/charts/status-segments";
import { createClient } from "@/lib/supabase/server";
import { ensureSampleData, getLendersWithCoverage } from "@/lib/data";
import {
  buildStatusSegments,
  getCoverageHistory,
  getLoanCommunication,
  getUpcoming,
  personalContactPhrase,
  weekStartOf,
} from "@/lib/dashboard";
import { getFlags } from "@/lib/flags";
import { formatDate, formatDateTime } from "@/lib/utils";
import { MEETING_TYPE_LABELS } from "@/lib/labels";
import { HeroHeader, type HeroChip } from "./hero-header";
import { KpiCards } from "./kpi-cards";
import { AttentionCard, type AttentionRow } from "./attention-card";
import { RelationshipRows, type RelationshipRow } from "./relationship-rows";
import { UpcomingPanel } from "./upcoming-panel";

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

type LenderRef = { id: string; full_name: string } | null;

export default async function DashboardPage() {
  await ensureSampleData();

  const supabase = await createClient();
  const now = new Date();
  const nowMs = now.getTime();
  const today = now.toISOString().slice(0, 10);
  const year = now.getFullYear();
  const weekStart = weekStartOf(now);

  const [
    lenders,
    { data: profile },
    { data: missingNotes },
    { data: overduePromises },
    { data: loansDue },
    { data: approvals },
    { data: goal },
    { data: plan },
    upcoming,
    history,
    loanComms,
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
      .from("active_loans")
      .select("id, borrower_name, stage, next_update_due_at, lender:lenders(id, full_name)")
      .eq("updates_active", true)
      .lte("next_update_due_at", today)
      .is("deleted_at", null),
    supabase
      .from("active_loans")
      .select("approved_sba_amount")
      .eq("stage", "sba_approved")
      .gte("sba_approval_date", `${year}-01-01`)
      .is("deleted_at", null),
    supabase.from("annual_goals").select("approval_goal").eq("year", year).maybeSingle(),
    supabase
      .from("weekly_relationship_plans")
      .select("id")
      .eq("week_start", weekStart)
      .maybeSingle(),
    getUpcoming(),
    getCoverageHistory(),
    getLoanCommunication(),
  ]);

  // ---- Coverage headline ---------------------------------------------------
  const active = lenders.filter((l) => l.active);
  const personalCovered = active.filter((l) => l.coverage.personal === "on_track").length;
  const coveragePct =
    active.length === 0 ? 0 : Math.round((personalCovered / active.length) * 100);
  const segments = buildStatusSegments(lenders);

  // ---- This week's plan ---------------------------------------------------
  const planItemsResult = plan
    ? await supabase
        .from("weekly_relationship_plan_items")
        .select(
          "id, rank, status, explanation, recommended_action, lender:lenders(id, full_name, first_name, email, mobile_phone, territory, institution:institutions(name))",
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
        institution: { name: string } | null;
      } | null;
      if (!lender) return null;
      const coverage = coverageById.get(lender.id);
      const days = coverage?.daysSincePersonal ?? null;
      return {
        itemId: item.id,
        lenderId: lender.id,
        name: lender.full_name,
        firstName: lender.first_name,
        institution: lender.institution?.name ?? null,
        territory: lender.territory,
        email: lender.email,
        mobile: lender.mobile_phone,
        daysSincePersonal: days,
        contactPhrase: personalContactPhrase(days),
        reason: item.explanation ?? "Chosen to keep the relationship warm",
        suggestedAction: item.recommended_action ?? "Send a short personal check-in",
        urgent: days === null || days > 40,
      };
    })
    .filter((r): r is RelationshipRow => r !== null);

  // ---- Today's attention --------------------------------------------------
  const attentionRows: AttentionRow[] = [
    ...(overduePromises ?? []).map((p): AttentionRow => {
      const lender = p.lender as unknown as LenderRef;
      const daysLate = p.due_at
        ? Math.floor((nowMs - new Date(p.due_at).getTime()) / 86_400_000)
        : 0;
      return {
        kind: "promise",
        id: p.id,
        urgency: daysLate > 3 ? "high" : "medium",
        title:
          p.direction === "i_promised"
            ? `You owe: ${p.description}`
            : `They owe you: ${p.description}`,
        meta: `${lender?.full_name ?? "Unassigned"} · was due ${formatDate(p.due_at)}`,
        lenderId: lender?.id ?? null,
      };
    }),
    ...(loansDue ?? []).map((loan): AttentionRow => {
      const lender = loan.lender as unknown as LenderRef;
      const daysLate = loan.next_update_due_at
        ? Math.floor((nowMs - new Date(loan.next_update_due_at).getTime()) / 86_400_000)
        : 0;
      return {
        kind: "loan",
        id: loan.id,
        urgency: daysLate > 2 ? "high" : "medium",
        title: `Weekly update due — ${loan.borrower_name}`,
        meta: `${loan.stage.replace(/_/g, " ")}${
          lender ? ` · ${lender.full_name}` : ""
        } · due ${formatDate(loan.next_update_due_at)}`,
        lenderId: lender?.id ?? null,
      };
    }),
    ...(missingNotes ?? []).map((m): AttentionRow => {
      const daysAgo = m.start_at
        ? Math.floor((nowMs - new Date(m.start_at).getTime()) / 86_400_000)
        : 0;
      return {
        kind: "notes",
        id: m.id,
        urgency: daysAgo > 1 ? "high" : "medium",
        title: `Notes not captured — ${m.title}`,
        meta: `${MEETING_TYPE_LABELS[m.meeting_type] ?? m.meeting_type} · ${formatDateTime(
          m.start_at,
        )}`,
        lenderId: null,
      };
    }),
  ].sort((a, b) => (a.urgency === b.urgency ? 0 : a.urgency === "high" ? -1 : 1));

  // ---- Hero copy ----------------------------------------------------------
  const promiseCount = (overduePromises ?? []).length;
  const noteCount = (missingNotes ?? []).length;

  const chips: HeroChip[] = [
    promiseCount > 0 && {
      icon: "promise" as const,
      label: `${plural(promiseCount, "overdue promise")}`,
    },
    loanComms.dueNow > 0 && {
      icon: "loan" as const,
      label: `${plural(loanComms.dueNow, "loan update")} due`,
    },
    relationshipRows.length > 0 && {
      icon: "list" as const,
      label: `${relationshipRows.length} on this week's list`,
    },
  ].filter(Boolean) as HeroChip[];

  const openItems = promiseCount + loanComms.dueNow + noteCount;
  const summary =
    openItems === 0
      ? relationshipRows.length > 0
        ? `Nothing overdue. ${relationshipRows.length} relationships are waiting on a first move.`
        : "Nothing overdue and nobody slipping. You're clear."
      : `${plural(openItems, "item")} need${openItems === 1 ? "s" : ""} you today${
          noteCount > 0 ? `, including ${plural(noteCount, "meeting note")} to capture` : ""
        }.`;

  const approvalsYtd = (approvals ?? []).length;
  const approvedAmount = (approvals ?? []).reduce(
    (sum, a) => sum + Number(a.approved_sba_amount ?? 0),
    0,
  );
  const nextMeeting = upcoming.meetings[0];

  return (
    <>
      <HeroHeader
        greeting={greeting()}
        firstName={profile?.display_name?.split(" ")[0] ?? null}
        summary={summary}
        chips={chips}
        coveragePct={coveragePct}
        coveredCount={personalCovered}
        activeCount={active.length}
        hasPlan={Boolean(plan)}
        aiEnabled={getFlags().ai}
      />

      <KpiCards
        coverage={{
          pct: coveragePct,
          covered: personalCovered,
          active: active.length,
          change30: history.changeFrom30Days,
          trend: history.insufficientData ? [] : history.points.map((p) => p.pct),
        }}
        meetings={{
          upcoming: upcoming.meetings.length,
          nextLabel: nextMeeting ? formatDateTime(nextMeeting.start_at) : null,
          awaitingNotes: noteCount,
        }}
        loans={loanComms}
        approvals={{
          ytd: approvalsYtd,
          goal: goal?.approval_goal ?? null,
          amount: approvedAmount,
        }}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          <RelationshipRows
            rows={relationshipRows}
            completed={completedCount}
            total={topItems.length}
            hasPlan={Boolean(plan)}
          />
          <AttentionCard rows={attentionRows} />
          <StatusSegments segments={segments} />
        </div>

        <div className="min-w-0 xl:sticky xl:top-6 xl:self-start">
          <UpcomingPanel data={upcoming} />
        </div>
      </div>
    </>
  );
}
