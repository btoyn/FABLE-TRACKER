import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SearchInput } from "@/components/search-input";
import { Badge, CoverageBadge, SampleBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";
import { getLendersWithCoverage, type LenderWithCoverage } from "@/lib/data";
import { matchScore } from "@/lib/fuzzy";
import { cn } from "@/lib/utils";
import { TIER_LABELS } from "@/lib/labels";

export const metadata = { title: "Lenders" };

const VIEWS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "needs_contact", label: "Needs contact" },
  { key: "no_personal_touch", label: "No personal touch" },
  { key: "campaign_only", label: "Campaign-only" },
  { key: "recently_contacted", label: "Recently contacted" },
  { key: "upcoming_meetings", label: "Upcoming meetings" },
  { key: "st_george", label: "St. George candidates" },
  { key: "salt_lake", label: "Salt Lake candidates" },
  { key: "active_loans", label: "Active-loan contacts" },
  { key: "overdue_promises", label: "Overdue promises" },
];

async function getViewSets() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const [loans, promises] = await Promise.all([
    supabase.from("active_loans").select("lender_id").is("deleted_at", null),
    supabase
      .from("promises")
      .select("lender_id")
      .eq("status", "open")
      .lt("due_at", today)
      .is("deleted_at", null),
  ]);
  return {
    activeLoanLenders: new Set((loans.data ?? []).map((r) => r.lender_id)),
    overduePromiseLenders: new Set((promises.data ?? []).map((r) => r.lender_id)),
  };
}

function applyView(
  lenders: LenderWithCoverage[],
  view: string,
  sets: { activeLoanLenders: Set<string>; overduePromiseLenders: Set<string> },
): LenderWithCoverage[] {
  switch (view) {
    case "needs_contact":
      return lenders.filter((l) =>
        ["grace", "overdue", "seriously_overdue", "never_contacted"].includes(l.coverage.visible),
      );
    case "no_personal_touch":
      return lenders.filter((l) => l.coverage.daysSincePersonal === null);
    case "campaign_only":
      return lenders.filter(
        (l) =>
          l.coverage.visible === "on_track" &&
          !["on_track", "grace"].includes(l.coverage.personal),
      );
    case "recently_contacted":
      return lenders
        .filter((l) => (l.coverage.daysSinceVisible ?? Infinity) <= 7)
        .sort((a, b) => (a.coverage.daysSinceVisible ?? 0) - (b.coverage.daysSinceVisible ?? 0));
    case "upcoming_meetings":
      return lenders.filter((l) => l.coverage.hasConfirmedFutureMeeting);
    case "st_george":
      return lenders.filter((l) => l.territory === "Southern Utah");
    case "salt_lake":
      return lenders.filter((l) => l.territory === "Wasatch Front");
    case "active_loans":
      return lenders.filter((l) => sets.activeLoanLenders.has(l.id));
    case "overdue_promises":
      return lenders.filter((l) => sets.overduePromiseLenders.has(l.id));
    default:
      return lenders;
  }
}

export default async function LendersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; view?: string }>;
}) {
  const { q, view = "all" } = await searchParams;
  const [lenders, sets] = await Promise.all([getLendersWithCoverage(), getViewSets()]);

  let list = applyView(lenders, view, sets);

  if (q) {
    list = list
      .map((l) => ({
        lender: l,
        score: matchScore(q, {
          name: l.full_name,
          institution: l.institution?.name,
          email: l.email,
        }),
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.lender);
  }

  return (
    <>
      <PageHeader
        title="Lenders"
        description={`${lenders.length} lender${lenders.length === 1 ? "" : "s"} in your workspace`}
        actions={
          <Link href="/lenders/new" className={buttonVariants({ variant: "primary", size: "md" })}>
            <Plus className="h-4 w-4" /> Add lender
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Suspense>
          <SearchInput placeholder="Search by name, bank, or email…" />
        </Suspense>
      </div>

      <div className="mb-5 flex flex-wrap gap-1.5">
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={`/lenders?view=${v.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              view === v.key
                ? "border-primary bg-primary-soft text-primary"
                : "border-border bg-surface text-muted hover:text-foreground",
            )}
          >
            {v.label}
          </Link>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState
          title={q ? `No lenders match “${q}”` : "No lenders in this view"}
          description={
            q
              ? "Try a different spelling — search checks names, institutions, and emails."
              : "Lenders will appear here as their status changes."
          }
          action={
            !q && view === "all" ? (
              <Link href="/lenders/new" className={buttonVariants({ variant: "primary", size: "sm" })}>
                Add your first lender
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <ul className="divide-y divide-border">
            {list.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/lenders/${l.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 transition-colors hover:bg-primary-soft/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{l.full_name}</span>
                      {l.is_sample && <SampleBadge />}
                      {l.relationship_tier !== "unassigned" && (
                        <Badge variant="outline">{TIER_LABELS[l.relationship_tier]}</Badge>
                      )}
                    </div>
                    <p className="truncate text-sm text-muted">
                      {[l.institution?.name, l.title, l.territory].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted" title="Days since last personal touch">
                      {l.coverage.daysSincePersonal !== null
                        ? l.coverage.daysSincePersonal === 0
                          ? "today"
                          : `${l.coverage.daysSincePersonal}d ago`
                        : "no personal touch"}
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
