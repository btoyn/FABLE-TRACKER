/**
 * Compact curved coverage sparkline. A royal-blue line over a very soft blue
 * area fill — the KPI number carries the value, the curve only carries
 * direction. Pure inline SVG, renders on the server.
 */

/** Catmull-Rom through the points, emitted as cubic beziers, so the line reads
 *  as a curve rather than a zigzag. */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

export function Sparkline({
  values,
  className,
  label,
}: {
  /** Percentages, oldest first. */
  values: number[];
  className?: string;
  label?: string;
}) {
  if (values.length < 2) return null;

  const W = 160;
  const H = 44;
  const pad = 4;
  const min = Math.min(...values);
  const max = Math.max(...values);
  // Floor the range so a nearly flat series doesn't look like noise.
  const span = Math.max(max - min, 8);
  const mid = (max + min) / 2;
  const lo = mid - span / 2;

  const pts = values.map((v, i) => ({
    x: pad + (i / (values.length - 1)) * (W - pad * 2),
    y: H - pad - ((v - lo) / span) * (H - pad * 2),
  }));

  const line = smoothPath(pts);
  const area = `${line} L${pts[pts.length - 1].x.toFixed(1)},${H} L${pts[0].x.toFixed(1)},${H} Z`;
  const last = pts[pts.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      role="img"
      aria-label={label ?? `Trend across the last ${values.length} weeks`}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e5bff" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#1e5bff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark-fill)" />
      <path
        d={line}
        fill="none"
        stroke="#1e5bff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={last.x}
        cy={last.y}
        r="2.8"
        fill="#ffffff"
        stroke="#1e5bff"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
