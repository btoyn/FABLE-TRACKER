import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge, CoverageBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";
import { getLendersWithCoverage } from "@/lib/data";
import { getGroupProposals } from "@/lib/dashboard";
import { GroupProposalsNeedingAttention } from "./group-proposals";
import { TERRITORIES } from "@/lib/labels";
import { cn } from "@/lib/utils";

export const metadata = { title: "Needs Attention" };

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "grace", label: "Grace period" },
  { key: "overdue", label: "Overdue" },
  { key: "seriously_overdue", label: "Seriously overdue" },
  { key: "campaign_only", label: "Campaign-only" },
  { key: "no_personal", label: "No personal touch" },
  { key: "active_loan", label: "Active loan" },
  { key: "open_promise", label: "Open promise" },
];

export default async function NeedsAttentionPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string; territory?: string }>;
}) {
  const { f = "all", territory } = await searchParams;
  const supabase = await createClient();

  const [lenders, loans, promises, groupProposals] = await Promise.all([
    getLendersWithCoverage(),
    supabase.from("active_loans").select("lender_id").is("deleted_at", null),
    supabase.from("promises").select("lender_id").eq("status", "open").is("deleted_at", null),
    getGroupProposals(),
  ]);

  const loanSet = new Set((loans.data ?? []).map((r) => r.lender_id));
  const promiseSet = new Set((promises.data ?? []).map((r) => r.lender_id));

  // Base queue: everyone not fully on track personally, worst first.
  const rank = { seriously_overdue: 0, overdue: 1, never_contacted: 2, grace: 3, on_track: 4 };
  let queue = lenders
    .filter((l) => l.active && l.coverage.personal !== "on_track")
    .sort(
      (a, b) =>
        rank[a.coverage.personal] - rank[b.coverage.personal] ||
        (b.coverage.daysSincePersonal ?? 9999) - (a.coverage.daysSincePersonal ?? 9999),
    );

  queue = queue.filter((l) => {
    if (territory && l.territory !== territory) return false;
    switch (f) {
      case "grace":
        return l.coverage.personal === "grace";
      case "overdue":
        return l.coverage.personal === "overdue";
      case "seriously_overdue":
        return l.coverage.personal === "seriously_overdue";
      case "campaign_only":
        return l.coverage.visible === "on_track";
      case "no_personal":
        return l.coverage.daysSincePersonal === null;
      case "active_loan":
        return loanSet.has(l.id);
      case "open_promise":
        return promiseSet.has(l.id);
      default:
        return true;
    }
  });

  return (
    <>
      <PageHeader
        title="Needs Attention"
        description={`${queue.length} lender${queue.length === 1 ? "" : "s"} slipping past the 30-day goal`}
      />

      {/* A group ask with a yes on it has a date he could take. That belongs
          in front of him, not behind a click on the dashboard. */}
      <GroupProposalsNeedingAttention proposals={groupProposals} />

      <div className="mb-3 flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((s) => (
          <Link
            key={s.key}
            href={`/needs-attention?f=${s.key}${territory ? `&territory=${encodeURIComponent(territory)}` : ""}`}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium",
              f === s.key
                ? "border-primary bg-primary-soft text-primary"
                : "border-border bg-surface text-muted hover:text-foreground",
            )}
          >
            {s.label}
          </Link>
        ))}
      </div>
      <div className="mb-5 flex flex-wrap gap-1.5">
        <Link
          href={`/needs-attention?f=${f}`}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium",
            !territory ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface text-muted",
          )}
        >
          All territories
        </Link>
        {TERRITORIES.map((t) => (
          <Link
            key={t}
            href={`/needs-attention?f=${f}&territory=${encodeURIComponent(t)}`}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium",
              territory === t
                ? "border-primary bg-primary-soft text-primary"
                : "border-border bg-surface text-muted hover:text-foreground",
            )}
          >
            {t}
          </Link>
        ))}
      </div>

      {queue.length === 0 ? (
        <EmptyState
          title="Nobody needs attention here"
          description="Every lender in this view is inside the 30-day window. Nice."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <ul className="divide-y divide-border">
            {queue.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/lenders/${l.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-primary-soft/40"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-medium">{l.full_name}</span>
                    <p className="truncate text-sm text-muted">
                      {[l.institution?.name, l.territory].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {loanSet.has(l.id) && <Badge variant="default">Active loan</Badge>}
                    {promiseSet.has(l.id) && <Badge variant="warning">Open promise</Badge>}
                    {l.coverage.visible === "on_track" &&
                      l.coverage.personal !== "on_track" && (
                        <Badge variant="muted">Campaign-only</Badge>
                      )}
                    <span className="text-muted">
                      {l.coverage.daysSincePersonal !== null
                        ? `${l.coverage.daysSincePersonal}d since personal touch`
                        : "no personal touch yet"}
                    </span>
                    <CoverageBadge status={l.coverage.personal} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
