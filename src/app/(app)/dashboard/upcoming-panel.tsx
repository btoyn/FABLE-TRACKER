import Link from "next/link";
import { CalendarClock, FileCheck2, FileClock, Plane, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/utils";
import { MEETING_TYPE_LABELS } from "@/lib/labels";
import type { UpcomingData } from "@/lib/dashboard";

/** Right-hand rail: what's coming, and what's still unsettled (§7). */
export function UpcomingPanel({ data }: { data: UpcomingData }) {
  const { meetings, tentative, trip } = data;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-4 w-4 text-primary/70" />
            Upcoming
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {meetings.length === 0 ? (
            <p className="text-sm text-muted">
              Nothing confirmed yet. Scheduling a meeting counts as coverage straight away.
            </p>
          ) : (
            <ul className="space-y-3">
              {meetings.map((m) => (
                <li key={m.id} className="rounded-xl border border-border bg-background p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-snug">{m.title}</p>
                    <Badge variant="default" className="shrink-0">
                      {MEETING_TYPE_LABELS[m.meeting_type] ?? m.meeting_type}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {formatDateTime(m.start_at)}
                    {m.location_name ? ` · ${m.location_name}` : ""}
                  </p>
                  {m.attendees.length > 0 && (
                    <p className="mt-1 truncate text-xs text-muted">
                      With {m.attendees.join(", ")}
                    </p>
                  )}
                  <div className="mt-2">
                    {m.meeting_brief_generated_at ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                        <FileCheck2 className="h-3.5 w-3.5" /> Brief ready
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-warning">
                        <FileClock className="h-3.5 w-3.5" /> Brief not prepared yet
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {trip && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Plane className="h-4 w-4 text-primary/70" />
              Upcoming trip
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <p className="text-sm font-medium">{trip.name}</p>
            <p className="mt-0.5 text-xs text-muted">
              {trip.territory ? `${trip.territory} · ` : ""}
              {trip.start_date ? formatDate(trip.start_date) : "Dates not set"}
              {trip.end_date ? ` – ${formatDate(trip.end_date)}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant={trip.status === "scheduled" ? "success" : "muted"}>
                {trip.status.replace(/_/g, " ")}
              </Badge>
              <span className="text-xs text-muted">
                {trip.confirmedCount} of {trip.targetCount} stops confirmed
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <HelpCircle className="h-4 w-4 text-primary/70" />
            Waiting on replies
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {tentative.length === 0 ? (
            <p className="text-sm text-muted">
              Nothing tentative. Holds you place from a lender row show up here until they&apos;re
              confirmed.
            </p>
          ) : (
            <ul className="space-y-2">
              {tentative.map((t) => (
                <li
                  key={`${t.kind}-${t.id}`}
                  className="flex items-start justify-between gap-2 rounded-lg border border-dashed border-border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.title}</p>
                    <p className="text-xs text-muted">
                      {t.start_at ? formatDateTime(t.start_at) : "No time set"}
                      {t.detail ? ` · ${t.detail}` : ""}
                    </p>
                  </div>
                  <Badge variant="warning" className="shrink-0">
                    {t.status.replace(/_/g, " ")}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Link
        href="/needs-attention"
        className="block rounded-[14px] border border-dashed border-border px-4 py-3 text-center text-sm font-medium text-primary transition-colors hover:bg-primary-soft active:bg-primary-soft/80"
      >
        Open needs-attention queue →
      </Link>
    </div>
  );
}
