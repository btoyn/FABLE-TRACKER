/**
 * Eight-week coverage sparkline for the Personal Coverage card. Deliberately
 * small and axis-free — the KPI number carries the value, the line only carries
 * the direction. Pure inline SVG, renders on the server.
 */
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

  const W = 148;
  const H = 34;
  const pad = 3;
  const min = Math.min(...values);
  const max = Math.max(...values);
  // Keep a floor on the range so a nearly flat series doesn't look like noise.
  const span = Math.max(max - min, 8);
  const mid = (max + min) / 2;
  const lo = mid - span / 2;

  const x = (i: number) => pad + (i / (values.length - 1)) * (W - pad * 2);
  const y = (v: number) => H - pad - ((v - lo) / span) * (H - pad * 2);

  const line = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(values.length - 1).toFixed(1)},${H} L${x(0).toFixed(1)},${H} Z`;
  const lastX = x(values.length - 1);
  const lastY = y(values[values.length - 1]);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      role="img"
      aria-label={label ?? `Trend over the last ${values.length} weeks`}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3157d5" stopOpacity="0.20" />
          <stop offset="100%" stopColor="#3157d5" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark-fill)" />
      <path
        d={line}
        fill="none"
        stroke="#3157d5"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={lastX} cy={lastY} r="2.6" fill="#ffffff" stroke="#3157d5" strokeWidth="1.75" />
    </svg>
  );
}
