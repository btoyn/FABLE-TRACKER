import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { LOOK_STAGE, daysBetween, lookState } from "@/lib/looks";
import { LookList, type LookLender, type LookRow } from "./look-list";

export const metadata = { title: "Looks" };

/**
 * Every time a lender brought up a possible deal, and whether you got back to
 * them.
 *
 * This is the closest thing the app has to an outcome measure: a lender who
 * keeps reaching out is a relationship that works, and one who never does is a
 * lunch habit. The follow-up clock is the reason to keep it fed.
 */
export default async function LooksPage() {
  const supabase = await createClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [{ data: looks }, { data: lenders }] = await Promise.all([
    supabase
      .from("opportunities")
      .select(
        "id, borrower_name, notes, stage, received_at, next_follow_up_at, last_activity_at, follow_up_attempt_count, dormant_reason, lender:lenders(id, full_name, institution:institutions(name))",
      )
      .is("deleted_at", null)
      .order("next_follow_up_at", { nullsFirst: false }),
    supabase
      .from("lenders")
      .select("id, full_name, institution:institutions(name)")
      .is("deleted_at", null)
      .eq("active", true)
      .order("full_name"),
  ]);

  const rows: LookRow[] = (looks ?? []).map((o) => {
    const lender = o.lender as unknown as {
      id: string;
      full_name: string;
      institution: { name: string } | null;
    } | null;

    const due = o.next_follow_up_at ? new Date(`${o.next_follow_up_at}T00:00:00`) : null;
    const daysLate = due === null ? 0 : daysBetween(due, today);

    return {
      id: o.id,
      borrowerName: o.borrower_name,
      notes: o.notes,
      stage: o.stage,
      receivedAt: o.received_at,
      lenderId: lender?.id ?? null,
      lenderName: lender?.full_name ?? null,
      institution: lender?.institution?.name ?? null,
      attempts: o.follow_up_attempt_count ?? 0,
      dormantReason: o.dormant_reason,
      daysLate: Math.max(0, daysLate),
      state: lookState(o.stage, daysLate),
    };
  });

  const lenderOptions: LookLender[] = (lenders ?? []).map((l) => ({
    id: l.id,
    name: l.full_name,
    institution: (l.institution as unknown as { name: string } | null)?.name ?? null,
  }));

  // Who is actually reaching out — the count that the original plan called the
  // one number worth measuring.
  const byLender = new Map<string, { name: string; count: number }>();
  for (const row of rows) {
    if (!row.lenderId || !row.lenderName) continue;
    const entry = byLender.get(row.lenderId) ?? { name: row.lenderName, count: 0 };
    entry.count += 1;
    byLender.set(row.lenderId, entry);
  }
  const topLenders = [...byLender.entries()]
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 5);

  const becameLoans = rows.filter((r) => r.stage === LOOK_STAGE.becameLoan).length;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Looks"
        description="Every time a lender brought up a possible deal — a real referral, a question, or a maybe. Log it and it comes back for follow-up."
      />
      <LookList
        rows={rows}
        lenders={lenderOptions}
        topLenders={topLenders}
        becameLoans={becameLoans}
      />
    </div>
  );
}
