import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { StatusSegment } from "@/lib/dashboard";

/**
 * Segmented horizontal relationship-status bar (§4). Every segment is a link
 * into the matching filtered list, and the legend rows are the same links so
 * thin segments stay reachable.
 */
export function StatusSegments({ segments }: { segments: StatusSegment[] }) {
  const total = segments.reduce((sum, s) => sum + s.count, 0);
  const visible = segments.filter((s) => s.count > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Relationship status</CardTitle>
        <CardDescription>
          {total > 0
            ? `All ${total} active lenders, grouped by where they stand. Select a group to see who's in it.`
            : "Add lenders to see how your relationships are distributed."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <EmptyState title="No active lenders yet" className="py-8" />
        ) : (
          <>
            <div className="flex h-4 w-full overflow-hidden rounded-full bg-black/[0.05]">
              {visible.map((s) => (
                <Link
                  key={s.key}
                  href={s.href}
                  title={`${s.label}: ${s.count} — ${s.hint}`}
                  aria-label={`${s.label}: ${s.count} lenders`}
                  className="group relative h-full transition-opacity first:rounded-l-full last:rounded-r-full hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  style={{
                    width: `${(s.count / total) * 100}%`,
                    backgroundColor: s.color,
                    minWidth: 6,
                  }}
                >
                  <span className="sr-only">
                    {s.label}: {s.count}
                  </span>
                </Link>
              ))}
            </div>

            <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
              {segments.map((s) => (
                <li key={s.key}>
                  <Link
                    href={s.href}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-primary-soft/60 active:bg-primary-soft"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="min-w-0 flex-1 truncate">{s.label}</span>
                    <span className="shrink-0 font-semibold tabular-nums">{s.count}</span>
                    <span className="w-10 shrink-0 text-right text-xs text-muted tabular-nums">
                      {total === 0 ? "0%" : `${Math.round((s.count / total) * 100)}%`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
