import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MEETING_TYPE_DURATIONS } from "./labels";
import type { AvailabilityRule } from "./scheduling";

/**
 * The shape of the next couple of weeks: the rules, and what's already spoken
 * for.
 *
 * Shared by the single-lender and group proposal flows so "busy" means one
 * thing. Dates offered to someone else count as busy — offering the same
 * Thursday twice is the one collision this is meant to prevent, and a group
 * ask makes it likelier, not less.
 */

const MINUTE = 60_000;

export interface SchedulingWindow {
  rules: AvailabilityRule[];
  horizonDays: number;
  slotCount: number;
  /** Absolute instants, ready to cross to the browser. */
  busy: { start: string; end: string }[];
}

export async function loadSchedulingWindow(
  supabase: SupabaseClient,
  now: Date,
): Promise<SchedulingWindow> {
  const [{ data: rules }, { data: prefs }, { data: meetings }, { data: pending }] =
    await Promise.all([
      supabase
        .from("availability_rules")
        .select("meeting_type, weekdays, start_minute, end_minute"),
      supabase
        .from("user_preferences")
        .select("propose_horizon_days, proposal_slot_count")
        .maybeSingle(),
      supabase
        .from("meetings")
        .select("start_at, end_at")
        .in("status", ["tentative", "confirmed"])
        .not("start_at", "is", null)
        .gte("start_at", now.toISOString())
        .is("deleted_at", null),
      supabase
        .from("meeting_proposals")
        .select("offered_slots, meeting_type")
        .eq("status", "sent")
        .is("deleted_at", null),
    ]);

  const busy: { start: string; end: string }[] = [];

  for (const m of meetings ?? []) {
    if (!m.start_at) continue;
    const start = new Date(m.start_at);
    const end = m.end_at ? new Date(m.end_at) : new Date(start.getTime() + 60 * MINUTE);
    busy.push({ start: start.toISOString(), end: end.toISOString() });
  }

  for (const p of pending ?? []) {
    const minutes = MEETING_TYPE_DURATIONS[p.meeting_type] ?? 60;
    for (const iso of p.offered_slots ?? []) {
      const start = new Date(iso);
      if (start < now) continue;
      busy.push({
        start: start.toISOString(),
        end: new Date(start.getTime() + minutes * MINUTE).toISOString(),
      });
    }
  }

  return {
    rules: (rules ?? []).map((r) => ({
      meetingType: r.meeting_type,
      weekdays: r.weekdays ?? [],
      startMinute: r.start_minute,
      endMinute: r.end_minute,
    })),
    horizonDays: prefs?.propose_horizon_days ?? 14,
    slotCount: prefs?.proposal_slot_count ?? 2,
    busy,
  };
}
