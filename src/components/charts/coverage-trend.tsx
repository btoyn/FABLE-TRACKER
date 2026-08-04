import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { CoverageHistory } from "@/lib/dashboard";

// A less-wide viewBox keeps the plot legibly tall when the card is narrow,
// since the SVG scales by width.
const W = 620;
const H = 215;
const PAD = { top: 16, right: 30, bottom: 28, left: 36 };

/**
 * Eight-week personal-coverage trend. One royal-blue line, a soft area fill,
 * three reference gridlines — nothing else competing for attention (§3).
 * Pure inline SVG, so it renders on the server with no chart dependency.
 */
export function CoverageTrend({ history }: { history: CoverageHistory }) {
  const { points, insufficientData, changeFromStart } = history;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base">Personal coverage over time</CardTitle>
          <CardDescription>
            Share of your lenders with a one-to-one touch inside the goal window.
          </CardDescription>
        </div>
        {!insufficientData && changeFromStart !== null && <TrendPill change={changeFromStart} />}
      </CardHeader>
      <CardContent>
        {insufficientData ? (
          <EmptyState
            title="Not enough history yet"
            description="Once you've logged activity across a couple of weeks, the trend line fills in here."
            className="py-10"
          />
        ) : (
          <Plot points={points} />
        )}
      </CardContent>
    </Card>
  );
}

function TrendPill({ change }: { change: number }) {
  const flat = change === 0;
  const up = change > 0;
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown;
  const tone = flat
    ? "bg-black/5 text-muted"
    : up
      ? "bg-success-soft text-success"
      : "bg-danger-soft text-danger";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {flat ? "Flat" : `${up ? "+" : ""}${change} pts`}
      <span className="font-normal opacity-70">8 wks</span>
    </span>
  );
}

function Plot({ points }: { points: CoverageHistory["points"] }) {
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const x = (i: number) =>
    PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (pct: number) => PAD.top + innerH - (pct / 100) * innerH;

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.pct)}`).join(" ");
  const area =
    `M${x(0)},${PAD.top + innerH} ` +
    points.map((p, i) => `L${x(i)},${y(p.pct)}`).join(" ") +
    ` L${x(points.length - 1)},${PAD.top + innerH} Z`;

  const last = points[points.length - 1];

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full min-w-[320px]"
        role="img"
        aria-label={`Personal coverage over the last ${points.length} weeks, currently ${last.pct} percent`}
      >
        <defs>
          <linearGradient id="coverage-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2b4fc2" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#2b4fc2" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Minimal gridlines: 0 / 50 / 100 only */}
        {[0, 50, 100].map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke="#e4e7ec"
              strokeWidth="1"
              strokeDasharray={tick === 0 ? undefined : "3 4"}
            />
            <text
              x={PAD.left - 8}
              y={y(tick) + 3.5}
              textAnchor="end"
              className="fill-[#94a3b8] text-[10px]"
            >
              {tick}%
            </text>
          </g>
        ))}

        <path d={area} fill="url(#coverage-fill)" />
        <path
          d={line}
          fill="none"
          stroke="#2b4fc2"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((p, i) => (
          <g key={p.date}>
            <circle
              cx={x(i)}
              cy={y(p.pct)}
              r={i === points.length - 1 ? 4.5 : 3}
              fill="#ffffff"
              stroke="#2b4fc2"
              strokeWidth={i === points.length - 1 ? 3 : 2}
            />
            <title>{`${p.label}: ${p.pct}% (${p.covered} of ${p.total})`}</title>
            <text
              x={x(i)}
              y={H - 8}
              textAnchor="middle"
              className="fill-[#94a3b8] text-[10px]"
            >
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
