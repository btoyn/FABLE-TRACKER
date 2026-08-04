import Link from "next/link";
import {
  CalendarClock,
  Clock,
  FileCheck2,
  FileClock,
  MapPin,
  Plane,
  Users,
  MailQuestion,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/utils";
import { MEETING_TYPE_LABELS } from "@/lib/labels";
import type { UpcomingData } from "@/lib/dashboard";

function RailTitle({
  icon: Icon,
  children,
  tone = "primary",
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  tone?: "primary" | "gold";
}) {
  return (
    <CardTitle className="flex items-center gap-2 text-[15px]">
      <Icon className={tone === "gold" ? "h-4 w-4 text-gold" : "h-4 w-4 text-primary/65"} />
      {children}
    </CardTitle>
  );
}

/** Right-hand rail: what's next, where you're going, and what's unresolved. */
export function UpcomingPanel({ data }: { data: UpcomingData }) {
  const { meetings, tentative, trip } = data;

  return (
    <div className="flex flex-col gap-4">
      {/* ---- 1. Upcoming ---- */}
      <Card>
        <CardHeader className="pb-1.5">
          <RailTitle icon={CalendarClock}>Upcoming</RailTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {meetings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center">
              <CalendarClock className="mx-auto h-5 w-5 text-muted/60" />
              <p className="mt-2 text-[13.5px] font-medium">Nothing booked</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">
                Scheduling a meeting covers that lender right away.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {meetings.map((m) => (
                <li
                  key={m.id}
                  className="rounded-xl border border-border bg-background/70 p-3.5 transition-colors hover:border-primary/25"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[14px] font-semibold leading-snug">{m.title}</p>
                    <Badge variant="meeting" size="sm" className="shrink-0">
                      {MEETING_TYPE_LABELS[m.meeting_type] ?? m.meeting_type}
                    </Badge>
                  </div>

                  <div className="mt-2 flex flex-col gap-1 text-[12.5px] text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      {formatDateTime(m.start_at)}
                    </span>
                    {m.location_name && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {m.location_name}
                      </span>
                    )}
                    {m.attendees.length > 0 && (
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{m.attendees.join(", ")}</span>
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5">
                    {m.meeting_brief_generated_at ? (
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-success">
                        <FileCheck2 className="h-3.5 w-3.5" /> Brief ready
                      </span>
                    ) : (
                      <Badge variant="pending" size="sm">
                        <FileClock className="h-3 w-3" /> Brief not ready
                      </Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ---- 2. Upcoming trip — pale gold accent ---- */}
      {trip && (
        <Card className="border-gold-border bg-gold-soft/45">
          <CardHeader className="pb-1.5">
            <RailTitle icon={Plane} tone="gold">
              Upcoming trip
            </RailTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <p className="text-[15px] font-semibold">{trip.name}</p>
            <p className="mt-1 text-[12.5px] text-muted">
              {trip.start_date ? formatDate(trip.start_date) : "Dates not set"}
              {trip.end_date ? ` – ${formatDate(trip.end_date)}` : ""}
              {trip.territory ? ` · ${trip.territory}` : ""}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <Badge variant={trip.status === "scheduled" ? "success" : "planning"} size="sm">
                {trip.status.replace(/_/g, " ")}
              </Badge>
              <span className="text-[12.5px] text-muted">
                <span className="font-semibold text-foreground">
                  {trip.confirmedCount} of {trip.targetCount}
                </span>{" "}
                stops confirmed
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---- 3. Waiting on replies ---- */}
      <Card>
        <CardHeader className="pb-1.5">
          <RailTitle icon={MailQuestion}>Waiting on replies</RailTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {tentative.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center">
              <CheckCircle2 className="mx-auto h-5 w-5 text-success/70" />
              <p className="mt-2 text-[13.5px] font-medium">Nothing outstanding</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">
                Holds you place from a lender row wait here until they&apos;re confirmed.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {tentative.map((t) => (
                <li
                  key={`${t.kind}-${t.id}`}
                  className="flex items-start justify-between gap-2 rounded-xl border border-dashed border-border px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-semibold">{t.title}</p>
                    <p className="text-[12px] text-muted">
                      {t.start_at ? formatDateTime(t.start_at) : "No time set"}
                      {t.detail ? ` · ${t.detail}` : ""}
                    </p>
                  </div>
                  <Badge variant="pending" size="sm" className="shrink-0">
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
        className="rounded-2xl border border-dashed border-border px-4 py-3 text-center text-[13.5px] font-semibold text-primary transition-colors hover:border-primary/35 hover:bg-primary-soft active:bg-primary-soft/70"
      >
        Open needs-attention queue →
      </Link>
    </div>
  );
}
