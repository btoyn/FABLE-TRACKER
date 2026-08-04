import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Badge, CoverageBadge, SampleBadge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";
import { getPreferences } from "@/lib/data";
import { lenderCoverage } from "@/lib/coverage";
import {
  ACTIVITY_TYPE_LABELS,
  HEALTH_LABELS,
  PERSONAL_DETAIL_CATEGORY_LABELS,
  ROLE_TYPE_LABELS,
  TIER_LABELS,
} from "@/lib/labels";
import { cn, formatDate, formatDateTime, relativeDays } from "@/lib/utils";
import { LenderTools } from "./lender-tools";

const TIMELINE_FILTERS = [
  { key: "all", label: "All activity" },
  { key: "personal", label: "Personal interactions" },
  { key: "deals", label: "Deals & loans" },
  { key: "notes", label: "Notes & promises" },
  { key: "campaigns", label: "Campaigns" },
] as const;

export default async function LenderProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ timeline?: string }>;
}) {
  const { id } = await params;
  const { timeline = "all" } = await searchParams;
  const supabase = await createClient();

  const [{ data: lender }, prefs] = await Promise.all([
    supabase
      .from("lenders")
      .select("*, institution:institutions(id, name, city, territory)")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle(),
    getPreferences(),
  ]);

  if (!lender) notFound();

  const [
    { data: coverageRow },
    { data: activities },
    { data: details },
    { data: promises },
    { data: loans },
    { data: opportunities },
    { data: upcomingMeetings },
    { data: history },
    { data: institutions },
  ] = await Promise.all([
    supabase.from("lender_coverage").select("*").eq("lender_id", id).maybeSingle(),
    supabase
      .from("activities")
      .select("*")
      .eq("lender_id", id)
      .is("deleted_at", null)
      .order("occurred_at", { ascending: false })
      .limit(100),
    supabase
      .from("lender_personal_details")
      .select("*")
      .eq("lender_id", id)
      .is("deleted_at", null)
      .order("captured_date", { ascending: false }),
    supabase
      .from("promises")
      .select("*")
      .eq("lender_id", id)
      .eq("status", "open")
      .is("deleted_at", null)
      .order("due_at"),
    supabase.from("active_loans").select("*").eq("lender_id", id).is("deleted_at", null),
    supabase
      .from("opportunities")
      .select("*")
      .eq("lender_id", id)
      .is("deleted_at", null)
      .not("stage", "in", "(handed_off,closed_no_handoff)"),
    supabase
      .from("meeting_attendees")
      .select("meeting:meetings(id, title, start_at, status, location_name)")
      .eq("lender_id", id),
    supabase
      .from("lender_institution_history")
      .select("*, institution:institutions(name)")
      .eq("lender_id", id)
      .order("start_date", { ascending: false }),
    supabase.from("institutions").select("name").is("deleted_at", null).order("name"),
  ]);

  const coverage = lenderCoverage(
    {
      lastVisibleTouchAt: coverageRow?.last_visible_touch_at ?? null,
      lastPersonalTouchAt: coverageRow?.last_personal_touch_at ?? null,
      hasConfirmedFutureMeeting: coverageRow?.has_confirmed_future_meeting ?? false,
    },
    {
      goalDays: prefs?.default_contact_goal_days ?? 30,
      graceDays: prefs?.contact_grace_days ?? 10,
    },
  );

  const lastActivity = activities?.[0] ?? null;

  const nextMeeting = (upcomingMeetings ?? [])
    .map((r) => r.meeting as unknown as { id: string; title: string; start_at: string; status: string; location_name: string | null })
    .filter((m) => m && m.status === "confirmed" && new Date(m.start_at) > new Date())
    .sort((a, b) => a.start_at.localeCompare(b.start_at))[0];

  // Next recommended action: simple explainable heuristic until the weekly AI plan.
  const recommendation = (() => {
    const overduePromise = (promises ?? []).find(
      (p) => p.direction === "i_promised" && p.due_at && p.due_at < new Date().toISOString().slice(0, 10),
    );
    if (overduePromise) return `Deliver what you promised: ${overduePromise.description}`;
    if (nextMeeting) return `Meeting coming up ${formatDateTime(nextMeeting.start_at)} — prep with recent notes.`;
    if (coverage.personal === "seriously_overdue" || coverage.personal === "overdue")
      return "Personal touch is overdue — a short check-in email or text would reset the clock.";
    if (coverage.personal === "grace") return "Grace period — worth a quick touch this week.";
    if (coverage.personal === "never_contacted") return "No personal touch yet — introduce yourself.";
    return "On track — nothing urgent.";
  })();

  const filteredActivities = (activities ?? []).filter((a) => {
    switch (timeline) {
      case "personal":
        return a.personal_touch;
      case "deals":
        return ["deal_conversation", "loan_update", "sba_question"].includes(a.activity_type) || a.opportunity_id || a.active_loan_id;
      case "notes":
        return a.activity_type === "note";
      case "campaigns":
        return a.activity_type === "campaign_email";
      default:
        return true;
    }
  });

  return (
    <>
      <PageHeader
        title={lender.full_name}
        description={[
          lender.title,
          lender.institution?.name,
          lender.city,
          lender.territory,
        ]
          .filter(Boolean)
          .join(" · ")}
      />

      {/* Status strip */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {lender.is_sample && <SampleBadge />}
        <CoverageBadge status={coverage.personal} />
        {coverage.visible !== coverage.personal && (
          <Badge variant="muted">Campaign-covered</Badge>
        )}
        {lender.relationship_tier !== "unassigned" && (
          <Badge variant="outline">{TIER_LABELS[lender.relationship_tier]}</Badge>
        )}
        {lender.relationship_health && (
          <Badge variant="outline">{HEALTH_LABELS[lender.relationship_health]}</Badge>
        )}
        <Badge variant="outline">{ROLE_TYPE_LABELS[lender.role_type] ?? lender.role_type}</Badge>
        {lender.do_not_contact && <Badge variant="danger">Do not contact</Badge>}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left column: at-a-glance + timeline */}
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Last contact</p>
                <p className="mt-0.5 font-medium">
                  {coverageRow?.last_visible_touch_at
                    ? `${formatDate(coverageRow.last_visible_touch_at)} (${relativeDays(coverageRow.last_visible_touch_at)})`
                    : "Never"}
                </p>
                {lastActivity && (
                  <p className="mt-0.5 text-sm text-muted">
                    {ACTIVITY_TYPE_LABELS[lastActivity.activity_type]}
                    {lastActivity.summary ? ` — ${lastActivity.summary}` : ""}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Next step</p>
                <p className="mt-0.5 text-sm">{recommendation}</p>
              </div>
              {nextMeeting && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">Upcoming meeting</p>
                  <p className="mt-0.5 text-sm">
                    {nextMeeting.title} · {formatDateTime(nextMeeting.start_at)}
                    {nextMeeting.location_name ? ` · ${nextMeeting.location_name}` : ""}
                  </p>
                </div>
              )}
              {(loans ?? []).length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">Active loans</p>
                  {(loans ?? []).map((loan) => (
                    <p key={loan.id} className="mt-0.5 text-sm">
                      {loan.borrower_name} · {loan.stage.replace(/_/g, " ")}
                    </p>
                  ))}
                </div>
              )}
              {(opportunities ?? []).length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">Early referrals</p>
                  {(opportunities ?? []).map((o) => (
                    <p key={o.id} className="mt-0.5 text-sm">
                      {o.borrower_name} · {o.stage.replace(/_/g, " ")}
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {(promises ?? []).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Open promises</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(promises ?? []).map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 text-sm">
                    <span>
                      <Badge variant={p.direction === "i_promised" ? "default" : "warning"} className="mr-2">
                        {p.direction === "i_promised" ? "I promised" : "They promised"}
                      </Badge>
                      {p.description}
                    </span>
                    <span className="shrink-0 text-muted">{p.due_at ? formatDate(p.due_at) : "no date"}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Timeline</CardTitle>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {TIMELINE_FILTERS.map((f) => (
                  <Link
                    key={f.key}
                    href={`/lenders/${id}?timeline=${f.key}`}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium",
                      timeline === f.key
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-border text-muted hover:text-foreground",
                    )}
                  >
                    {f.label}
                  </Link>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {filteredActivities.length === 0 ? (
                <EmptyState
                  title="Nothing here yet"
                  description="Log a call, email, or meeting and it will show up on this timeline."
                  className="py-8"
                />
              ) : (
                <ol className="space-y-3">
                  {filteredActivities.map((a) => (
                    <li key={a.id} className="flex gap-3 text-sm">
                      <span className="w-24 shrink-0 pt-0.5 text-xs text-muted">
                        {formatDate(a.occurred_at)}
                      </span>
                      <div>
                        <p className="font-medium">
                          {ACTIVITY_TYPE_LABELS[a.activity_type] ?? a.activity_type}
                          {a.direction === "inbound" && (
                            <Badge variant="success" className="ml-2">They reached out</Badge>
                          )}
                          {!a.counts_for_coverage && (
                            <Badge variant="outline" className="ml-2">Doesn&apos;t count as touch</Badge>
                          )}
                        </p>
                        {(a.subject || a.summary) && (
                          <p className="text-muted">{a.subject ?? a.summary}</p>
                        )}
                        {a.subject && a.summary && <p className="text-muted">{a.summary}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: tools, personal details, history */}
        <div className="space-y-5">
          <LenderTools
            lender={{
              id: lender.id,
              full_name: lender.full_name,
              first_name: lender.first_name,
              email: lender.email,
              mobile_phone: lender.mobile_phone,
              relationship_tier: lender.relationship_tier,
              relationship_health: lender.relationship_health,
              communication_style: lender.communication_style,
              territory: lender.territory,
              notes: lender.notes,
            }}
            personalDetails={(details ?? []).map((d) => ({
              id: d.id,
              category: d.category,
              detail: d.detail,
              label: PERSONAL_DETAIL_CATEGORY_LABELS[d.category] ?? d.category,
            }))}
            institutionNames={(institutions ?? []).map((i) => i.name)}
            currentInstitution={lender.institution?.name ?? null}
          />

          {(history ?? []).length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Institution history</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {(history ?? []).map((h) => (
                  <div key={h.id} className="flex items-center justify-between">
                    <span className={h.is_current ? "font-medium" : "text-muted"}>
                      {(h.institution as unknown as { name: string } | null)?.name ?? "Unknown"}
                      {h.is_current && " (current)"}
                    </span>
                    <span className="text-xs text-muted">
                      {h.start_date ? formatDate(h.start_date) : ""}
                      {h.end_date ? ` – ${formatDate(h.end_date)}` : ""}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
