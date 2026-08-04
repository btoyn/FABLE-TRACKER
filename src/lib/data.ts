import "server-only";
import { createClient } from "@/lib/supabase/server";
import { lenderCoverage, type LenderCoverageResult } from "@/lib/coverage";
import type { CoverageRow, Lender, UserPreferences } from "@/lib/types";

export interface LenderWithCoverage extends Lender {
  institution: { id: string; name: string } | null;
  coverage: LenderCoverageResult;
}

export async function getPreferences(): Promise<UserPreferences | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("user_preferences").select("*").maybeSingle();
  return data;
}

/** All active lenders joined with the coverage view, statuses computed. */
export async function getLendersWithCoverage(): Promise<LenderWithCoverage[]> {
  const supabase = await createClient();

  const [{ data: lenders }, { data: coverage }, prefs] = await Promise.all([
    supabase
      .from("lenders")
      .select("*, institution:institutions(id, name)")
      .is("deleted_at", null)
      .order("full_name"),
    supabase.from("lender_coverage").select("*"),
    getPreferences(),
  ]);

  const coverageByLender = new Map<string, CoverageRow>(
    (coverage ?? []).map((c: CoverageRow) => [c.lender_id, c]),
  );
  const opts = {
    goalDays: prefs?.default_contact_goal_days ?? 30,
    graceDays: prefs?.contact_grace_days ?? 10,
  };

  return ((lenders ?? []) as unknown as (Lender & { institution: { id: string; name: string } | null })[]).map(
    (l) => {
      const c = coverageByLender.get(l.id);
      return {
        ...l,
        coverage: lenderCoverage(
          {
            lastVisibleTouchAt: c?.last_visible_touch_at ?? null,
            lastPersonalTouchAt: c?.last_personal_touch_at ?? null,
            hasConfirmedFutureMeeting: c?.has_confirmed_future_meeting ?? false,
          },
          opts,
        ),
      };
    },
  );
}

/** Seed the demo workspace for brand-new accounts (spec §14). */
export async function ensureSampleData(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { count } = await supabase
    .from("lenders")
    .select("id", { count: "exact", head: true });

  if ((count ?? 0) === 0) {
    await supabase.rpc("create_sample_data", { p_user_id: user.id });
  }
}
