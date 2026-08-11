import Link from "next/link";
import { HeartPulse } from "lucide-react";
import type { RelationshipHealth } from "@/lib/health";

/**
 * Relationship Health — one row per band with a proportional coloured bar and a
 * count. Teal / blue / gold / danger tokens map to Strong / Healthy / Cooling /
 * At risk. Each row is a keyboard-accessible link to a filtered lender view.
 */
export function RelationshipHealthWidget({ health }: { health: RelationshipHealth }) {
  const max = Math.max(1, ...health.bands.map((b) => b.count));

  return (
    <section>
      <p className="eyebrow mb-2 text-navy/70">Relationship health</p>

      <div className="rounded-[20px] border border-border/80 bg-surface p-5 shadow-[0_10px_30px_rgba(16,24,40,0.05)]">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-primary">
              <HeartPulse className="h-[18px] w-[18px]" />
            </span>
            <span className="text-[13px] font-semibold text-foreground">
              {health.total} active {health.total === 1 ? "relationship" : "relationships"}
            </span>
          </span>
          <span className="text-right">
            <span className="block text-[26px] font-bold leading-none tabular-nums text-foreground">
              {health.average}
            </span>
            <span className="text-[11px] font-medium text-muted">avg score</span>
          </span>
        </div>

        <ul className="mt-4 flex flex-col gap-2.5">
          {health.bands.map((band) => (
            <li key={band.key}>
              <Link
                href={band.href}
                className="group flex items-center gap-3 rounded-xl px-1.5 py-1.5 transition-colors hover:bg-black/[0.03]"
              >
                <span className="w-16 shrink-0 text-[12.5px] font-semibold text-foreground">
                  {band.label}
                </span>
                <span
                  className="h-2.5 flex-1 overflow-hidden rounded-full bg-black/[0.05]"
                  aria-hidden="true"
                >
                  <span
                    className="block h-full rounded-full transition-[width]"
                    style={{
                      width: `${band.count === 0 ? 0 : Math.max(6, (band.count / max) * 100)}%`,
                      backgroundColor: band.color,
                    }}
                  />
                </span>
                <span className="w-6 shrink-0 text-right text-[13px] font-bold tabular-nums text-foreground">
                  {band.count}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-3 border-t border-border/70 pt-3 text-[11.5px] leading-relaxed text-muted">
          Scored on contact recency, meeting and email cadence, referrals, responsiveness and how
          complete each profile is.
        </p>
      </div>
    </section>
  );
}
