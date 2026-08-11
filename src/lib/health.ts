import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getLendersWithCoverage, getPreferences } from "@/lib/data";
import type { LenderWithCoverage } from "@/lib/data";

/**
 * Relationship health score (0–100) per active lender.
 *
 * Product-spec weighting:
 *   contact recency ............ 30%
 *   meeting frequency .......... 20%
 *   email engagement ........... 20%
 *   referrals received ......... 15%
 *   responsiveness ............. 10%
 *   personal-info completeness . 5%
 *
 * Every component is derived from REAL data already in the workspace — no
 * invented or persisted values:
 *
 *  - recency:        days since last personal touch (coverage engine, §9).
 *  - meeting freq:   count of in-person / meeting activities in the last 180d.
 *  - email engagement: count of two-way email activities (personal_email +
 *                    incoming_email) in the last 180d. We do NOT have open/click
 *                    telemetry, so "engagement" is measured as logged email
 *                    correspondence volume — the closest honest signal we hold.
 *  - referrals:      number of opportunities this lender has referred (all-time,
 *                    non-deleted).
 *  - responsiveness: share of this lender's recent activity that was inbound
 *                    (initiated_by_lender OR direction inbound/two_way). We have
 *                    no reply-latency tracking, so "do they engage back" is
 *                    proxied by how much of the timeline they drove. A lender
 *                    with no activity scores 0 here (correctly reads as at-risk).
 *  - completeness:   fraction of key profile fields that are filled in.
 *
 * No weights are renormalized because all six components map to a real signal.
 */

const RECENCY_WEIGHT = 0.3;
const MEETING_WEIGHT = 0.2;
const EMAIL_WEIGHT = 0.2;
const REFERRAL_WEIGHT = 0.15;
const RESPONSIVENESS_WEIGHT = 0.1;
const COMPLETENESS_WEIGHT = 0.05;

/** Activity types that read as a face-to-face / scheduled meeting touch. */
const MEETING_ACTIVITY_TYPES = new Set([
  "lunch",
  "breakfast",
  "golf",
  "office_visit",
  "pop_in",
  "general_meeting",
]);

const EMAIL_ACTIVITY_TYPES = new Set(["personal_email", "incoming_email"]);

/** Signals collected per lender before scoring. */
interface HealthSignals {
  meetingCount: number;
  emailCount: number;
  inboundCount: number;
  activityCount: number;
  referralCount: number;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Diminishing-returns mapping: `count` relative to the count that earns full marks. */
const countScore = (count: number, full: number) => clamp01(count / full);

function recencyScore(lender: LenderWithCoverage, goalDays: number): number {
  const days = lender.coverage.daysSincePersonal;
  if (days === null) return 0; // never personally contacted
  // Full marks at 0 days, decaying to 0 at twice the contact goal.
  return clamp01(1 - days / (goalDays * 2));
}

function completenessScore(lender: LenderWithCoverage): number {
  const fields = [
    lender.email,
    lender.mobile_phone ?? lender.office_phone,
    lender.title,
    lender.notes,
    lender.preferred_contact_method,
    lender.communication_style,
  ];
  const filled = fields.filter((f) => Boolean(f && String(f).trim())).length;
  return filled / fields.length;
}

export function lenderHealthScore(
  lender: LenderWithCoverage,
  signals: HealthSignals,
  goalDays: number,
): number {
  const recency = recencyScore(lender, goalDays);
  const meeting = countScore(signals.meetingCount, 3); // ~3 meetings / 6mo = healthy
  const email = countScore(signals.emailCount, 6); // ~1 email / month = healthy
  const referral = countScore(signals.referralCount, 3);
  const responsiveness =
    signals.activityCount === 0 ? 0 : clamp01(signals.inboundCount / signals.activityCount);
  const completeness = completenessScore(lender);

  const score =
    RECENCY_WEIGHT * recency +
    MEETING_WEIGHT * meeting +
    EMAIL_WEIGHT * email +
    REFERRAL_WEIGHT * referral +
    RESPONSIVENESS_WEIGHT * responsiveness +
    COMPLETENESS_WEIGHT * completeness;

  return Math.round(clamp01(score) * 100);
}

export type HealthBandKey = "strong" | "healthy" | "cooling" | "at_risk";

export interface HealthBand {
  key: HealthBandKey;
  label: string;
  count: number;
  /** CSS colour token used for the bar. */
  color: string;
  /** Where the band links to on the dashboard. */
  href: string;
}

/** Band a 0–100 score. Strong 80–100, Healthy 60–79, Cooling 40–59, At risk <40. */
export function bandOf(score: number): HealthBandKey {
  if (score >= 80) return "strong";
  if (score >= 60) return "healthy";
  if (score >= 40) return "cooling";
  return "at_risk";
}

export interface RelationshipHealth {
  bands: HealthBand[];
  total: number;
  /** Average score across active lenders, for a headline figure. */
  average: number;
}

/**
 * Compute the health score for every active lender and roll them up into the
 * four dashboard bands. One extra pair of light queries (activities + a couple
 * of opportunity columns), joined in memory to the already-loaded coverage set.
 */
export async function getRelationshipHealth(): Promise<RelationshipHealth> {
  const supabase = await createClient();
  const prefs = await getPreferences();
  const goalDays = prefs?.default_contact_goal_days ?? 30;

  const since = new Date(Date.now() - 180 * 86_400_000).toISOString();

  const [lenders, { data: activities }, { data: opportunities }] = await Promise.all([
    getLendersWithCoverage(),
    supabase
      .from("activities")
      .select("lender_id, activity_type, direction, initiated_by_lender")
      .gte("occurred_at", since)
      .is("deleted_at", null),
    supabase
      .from("opportunities")
      .select("lender_id")
      .is("deleted_at", null),
  ]);

  const active = lenders.filter((l) => l.active);

  // Fold the timeline down to per-lender signal counts.
  const signalsByLender = new Map<string, HealthSignals>();
  const ensure = (id: string): HealthSignals => {
    let s = signalsByLender.get(id);
    if (!s) {
      s = { meetingCount: 0, emailCount: 0, inboundCount: 0, activityCount: 0, referralCount: 0 };
      signalsByLender.set(id, s);
    }
    return s;
  };

  for (const a of activities ?? []) {
    if (!a.lender_id) continue;
    const s = ensure(a.lender_id);
    s.activityCount += 1;
    if (MEETING_ACTIVITY_TYPES.has(a.activity_type)) s.meetingCount += 1;
    if (EMAIL_ACTIVITY_TYPES.has(a.activity_type)) s.emailCount += 1;
    if (a.initiated_by_lender || a.direction === "inbound" || a.direction === "two_way") {
      s.inboundCount += 1;
    }
  }
  for (const o of opportunities ?? []) {
    if (!o.lender_id) continue;
    ensure(o.lender_id).referralCount += 1;
  }

  const empty: HealthSignals = {
    meetingCount: 0,
    emailCount: 0,
    inboundCount: 0,
    activityCount: 0,
    referralCount: 0,
  };

  const tally: Record<HealthBandKey, number> = { strong: 0, healthy: 0, cooling: 0, at_risk: 0 };
  let scoreSum = 0;

  for (const lender of active) {
    const score = lenderHealthScore(lender, signalsByLender.get(lender.id) ?? empty, goalDays);
    scoreSum += score;
    tally[bandOf(score)] += 1;
  }

  const bands: HealthBand[] = [
    { key: "strong", label: "Strong", count: tally.strong, color: "var(--teal)", href: "/lenders" },
    {
      key: "healthy",
      label: "Healthy",
      count: tally.healthy,
      color: "var(--primary)",
      href: "/lenders",
    },
    {
      key: "cooling",
      label: "Cooling",
      count: tally.cooling,
      color: "var(--gold)",
      href: "/needs-attention",
    },
    {
      key: "at_risk",
      label: "At risk",
      count: tally.at_risk,
      color: "var(--danger)",
      href: "/needs-attention",
    },
  ];

  return {
    bands,
    total: active.length,
    average: active.length === 0 ? 0 : Math.round(scoreSum / active.length),
  };
}
