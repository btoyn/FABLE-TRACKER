import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getPreferences, type LenderWithCoverage } from "@/lib/data";
import { daysSince } from "@/lib/coverage";

/** One plotted week in the personal-coverage trend. */
export interface CoveragePoint {
  /** ISO date of the week end (the day the snapshot is measured on). */
  date: string;
  /** Short axis label, e.g. "Jun 8". */
  label: string;
  /** Percent of the lenders that existed then who were personally covered. */
  pct: number;
  covered: number;
  total: number;
}

export interface CoverageHistory {
  points: CoveragePoint[];
  /** Percentage-point change from the first plotted week to the last. */
  changeFromStart: number | null;
  /** Percentage-point change week over week. */
  changeFromPrevious: number | null;
  /** True when there isn't enough history to draw an honest line. */
  insufficientData: boolean;
}

const WEEKS = 8;

/**
 * Monday of the week containing `d`, as an ISO date — the key weekly plans are
 * stored under. Lives here rather than in the actions file because a "use
 * server" module may only export async functions.
 */
export function weekStartOf(d: Date = new Date()): string {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  const dow = copy.getDay(); // 0 = Sunday
  copy.setDate(copy.getDate() - (dow === 0 ? 6 : dow - 1));
  return copy.toISOString().slice(0, 10);
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/**
 * Reconstruct personal coverage for each of the last 8 weeks from the activity
 * timeline (§9 rules, applied historically).
 *
 * A lender counts as covered on a given date when they had a personal touch
 * within the goal window ending that date, or a confirmed meeting still in the
 * future as of that date. Lenders created after the snapshot date are excluded
 * from that week entirely, so onboarding a big list never shows as a crash.
 */
export async function getCoverageHistory(): Promise<CoverageHistory> {
  const supabase = await createClient();
  const prefs = await getPreferences();
  const goalDays = prefs?.default_contact_goal_days ?? 30;

  const today = startOfDay(new Date());
  const points: Date[] = [];
  for (let i = WEEKS - 1; i >= 0; i--) {
    points.push(new Date(today.getTime() - i * 7 * 86_400_000));
  }
  const earliest = points[0];
  // Reach back one goal window before the first point so its lookback is complete.
  const fetchFrom = new Date(earliest.getTime() - goalDays * 86_400_000).toISOString();

  const [{ data: lenders }, { data: activities }, { data: attendances }] = await Promise.all([
    supabase.from("lenders").select("id, active, created_at").is("deleted_at", null),
    supabase
      .from("activities")
      .select("lender_id, occurred_at")
      .eq("counts_for_coverage", true)
      .neq("activity_type", "campaign_email")
      .not("lender_id", "is", null)
      .gte("occurred_at", fetchFrom)
      .is("deleted_at", null),
    // Embed attendees under meetings rather than filtering through the join,
    // which keeps the query readable and avoids embedded-filter syntax.
    supabase
      .from("meetings")
      .select("start_at, attendees:meeting_attendees(lender_id)")
      .eq("status", "confirmed")
      .gte("start_at", fetchFrom)
      .is("deleted_at", null),
  ]);

  // lender_id -> sorted touch timestamps (personal activities + confirmed meetings)
  const touches = new Map<string, number[]>();
  const push = (lenderId: string | null, at: string | null) => {
    if (!lenderId || !at) return;
    const list = touches.get(lenderId) ?? [];
    list.push(new Date(at).getTime());
    touches.set(lenderId, list);
  };

  for (const a of activities ?? []) push(a.lender_id, a.occurred_at);
  for (const meeting of attendances ?? []) {
    const attendees = (meeting.attendees ?? []) as unknown as { lender_id: string }[];
    for (const attendee of attendees) push(attendee.lender_id, meeting.start_at);
  }

  const active = (lenders ?? []).filter((l) => l.active);

  const series: CoveragePoint[] = points.map((date) => {
    const at = date.getTime();
    const windowStart = at - goalDays * 86_400_000;
    const eligible = active.filter((l) => new Date(l.created_at).getTime() <= at);

    const covered = eligible.filter((l) => {
      const list = touches.get(l.id);
      if (!list) return false;
      return list.some(
        (t) =>
          // a personal touch inside the goal window ending on this date
          (t <= at && t > windowStart) ||
          // or a confirmed meeting that was still upcoming on this date
          t > at,
      );
    }).length;

    return {
      date: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      pct: eligible.length === 0 ? 0 : Math.round((covered / eligible.length) * 100),
      covered,
      total: eligible.length,
    };
  });

  const withData = series.filter((p) => p.total > 0);
  const last = series[series.length - 1];
  const prev = series[series.length - 2];
  const first = withData[0];

  return {
    points: series,
    changeFromStart: first && last && withData.length > 1 ? last.pct - first.pct : null,
    changeFromPrevious: prev && prev.total > 0 && last ? last.pct - prev.pct : null,
    insufficientData: withData.length < 2,
  };
}

export type StatusSegmentKey =
  | "on_track"
  | "grace"
  | "overdue"
  | "meeting_scheduled"
  | "campaign_only";

export interface StatusSegment {
  key: StatusSegmentKey;
  label: string;
  count: number;
  href: string;
  /** Fill color — royal-blue family plus restrained status hues. */
  color: string;
  hint: string;
}

/**
 * Bucket every active lender into exactly one relationship status, worst-case
 * last so the segments always sum to the active total.
 */
export function buildStatusSegments(lenders: LenderWithCoverage[]): StatusSegment[] {
  const active = lenders.filter((l) => l.active);

  let onTrack = 0;
  let grace = 0;
  let overdue = 0;
  let meeting = 0;
  let campaignOnly = 0;

  for (const l of active) {
    const { personal, visible, hasConfirmedFutureMeeting } = l.coverage;
    if (hasConfirmedFutureMeeting) meeting++;
    else if (personal === "on_track") onTrack++;
    else if (personal === "grace") grace++;
    else if (visible === "on_track") campaignOnly++;
    else overdue++;
  }

  return [
    {
      key: "on_track",
      label: "On track",
      count: onTrack,
      href: "/lenders?view=on_track",
      color: "#2b4fc2",
      hint: "Personal contact inside the goal window",
    },
    {
      key: "meeting_scheduled",
      label: "Meeting scheduled",
      count: meeting,
      href: "/lenders?view=upcoming_meetings",
      color: "#6b8ce0",
      hint: "Confirmed meeting on the calendar",
    },
    {
      key: "grace",
      label: "Grace period",
      count: grace,
      href: "/needs-attention?f=grace",
      color: "#c99a2e",
      hint: "Just past the goal — still recoverable",
    },
    {
      key: "campaign_only",
      label: "Campaign only",
      count: campaignOnly,
      href: "/needs-attention?f=campaign_only",
      color: "#8a94a6",
      hint: "Reached by campaign email, but no personal touch",
    },
    {
      key: "overdue",
      label: "Overdue",
      count: overdue,
      href: "/needs-attention",
      color: "#b3372f",
      hint: "Overdue, seriously overdue, or never contacted",
    },
  ];
}

export interface UpcomingData {
  meetings: {
    id: string;
    title: string;
    start_at: string | null;
    meeting_type: string;
    location_name: string | null;
    notes_status: string;
    meeting_brief_generated_at: string | null;
    attendees: string[];
  }[];
  tentative: {
    id: string;
    title: string;
    start_at: string | null;
    status: string;
    kind: "meeting" | "trip_target";
    detail: string | null;
  }[];
  trip: {
    id: string;
    name: string;
    territory: string | null;
    start_date: string | null;
    end_date: string | null;
    status: string;
    targetCount: number;
    confirmedCount: number;
  } | null;
}

/** Everything the right-hand Upcoming panel needs (§7). */
export async function getUpcoming(): Promise<UpcomingData> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const today = nowIso.slice(0, 10);

  const [{ data: confirmed }, { data: tentativeMeetings }, { data: trips }, { data: tripTargets }] =
    await Promise.all([
      supabase
        .from("meetings")
        .select(
          "id, title, start_at, meeting_type, location_name, notes_status, meeting_brief_generated_at, attendees:meeting_attendees(lender:lenders(full_name))",
        )
        .eq("status", "confirmed")
        .gte("start_at", nowIso)
        .is("deleted_at", null)
        .order("start_at")
        .limit(5),
      supabase
        .from("meetings")
        .select("id, title, start_at, status, location_name")
        .in("status", ["proposed", "tentative"])
        .is("deleted_at", null)
        .order("start_at", { nullsFirst: false })
        .limit(5),
      supabase
        .from("trips")
        .select("id, name, territory, start_date, end_date, status")
        .in("status", ["planning", "scheduled", "in_progress"])
        .or(`end_date.gte.${today},end_date.is.null`)
        .is("deleted_at", null)
        .order("start_date", { nullsFirst: false })
        .limit(1),
      supabase
        .from("trip_targets")
        .select("id, trip_id, status, target_type, lender:lenders(full_name)")
        .in("status", ["invited", "awaiting_reply", "tentative", "candidate", "confirmed"]),
    ]);

  const trip = (trips ?? [])[0] ?? null;
  const targetsForTrip = (tripTargets ?? []).filter((t) => trip && t.trip_id === trip.id);

  const tentative: UpcomingData["tentative"] = [
    ...(tentativeMeetings ?? []).map((m) => ({
      id: m.id,
      title: m.title,
      start_at: m.start_at,
      status: m.status,
      kind: "meeting" as const,
      detail: m.location_name,
    })),
    ...targetsForTrip
      .filter((t) => ["invited", "awaiting_reply", "tentative"].includes(t.status))
      .map((t) => ({
        id: t.id,
        title: (t.lender as unknown as { full_name: string } | null)?.full_name ?? "Trip target",
        start_at: null,
        status: t.status,
        kind: "trip_target" as const,
        detail: t.target_type.replace(/_/g, " "),
      })),
  ].slice(0, 6);

  return {
    meetings: (confirmed ?? []).map((m) => ({
      id: m.id,
      title: m.title,
      start_at: m.start_at,
      meeting_type: m.meeting_type,
      location_name: m.location_name,
      notes_status: m.notes_status,
      meeting_brief_generated_at: m.meeting_brief_generated_at,
      attendees: (
        (m.attendees ?? []) as unknown as { lender: { full_name: string } | null }[]
      )
        .map((a) => a.lender?.full_name)
        .filter((n): n is string => Boolean(n)),
    })),
    tentative,
    trip: trip
      ? {
          ...trip,
          targetCount: targetsForTrip.length,
          confirmedCount: targetsForTrip.filter((t) => t.status === "confirmed").length,
        }
      : null,
  };
}

export interface LoanCommunication {
  activeLoans: number;
  updatedThisWeek: number;
  dueNow: number;
}

/** Weekly loan-communication KPI: every active loan gets a touch each week (§26). */
export async function getLoanCommunication(): Promise<LoanCommunication> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const { data: loans } = await supabase
    .from("active_loans")
    .select("id, last_update_sent_at, next_update_due_at, updates_active")
    .eq("updates_active", true)
    .is("deleted_at", null);

  const list = loans ?? [];
  return {
    activeLoans: list.length,
    updatedThisWeek: list.filter(
      (l) => l.last_update_sent_at && l.last_update_sent_at >= weekAgo,
    ).length,
    dueNow: list.filter((l) => l.next_update_due_at && l.next_update_due_at <= today).length,
  };
}

/** Days since a personal touch, phrased for a lender row. */
export function personalContactPhrase(days: number | null): string {
  if (days === null) return "No personal contact yet";
  if (days === 0) return "Personal contact today";
  if (days === 1) return "1 day since personal contact";
  return `${days} days since personal contact`;
}

export { daysSince };
