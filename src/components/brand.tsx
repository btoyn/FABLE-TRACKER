/**
 * Basecamp brand marks.
 *
 * Geometry traced from the brand sheet at docs/brand/basecamp-brand-sheet.png. It is a
 * raster, and the mark inside it is only ~350px wide — fine shrunk into a
 * sidebar, soft anywhere larger — so the three flat shapes were vectorised
 * instead: two polygons for the peaks and a fitted circular arc for the sun.
 * Vector keeps it crisp at every size and lets the monochrome lockup reuse the
 * same paths.
 *
 * If a real vector file arrives from the designer, replace the paths here and
 * nothing else has to change.
 */

const VIEWBOX = "0 0 298 202";

/**
 * The mountain-and-sun mark on its own. Sized by the caller.
 *
 * `onDark` flips the near peak to white, which is what the sheet's app-icon
 * variant does — the navy peak would otherwise vanish into a navy ground.
 */
export function BasecampMark({
  className,
  style,
  onDark = false,
}: {
  className?: string;
  style?: React.CSSProperties;
  onDark?: boolean;
}) {
  return (
    <svg viewBox={VIEWBOX} className={className} style={style} fill="none" aria-hidden="true">
      {/* Sun arc sits behind the peaks, as on the sheet. */}
      <path
        d="M95.5,78.9 A55.4,55.4 0 1 1 200.5,78.9"
        stroke="var(--brand-gold)"
        strokeWidth="11.3"
        fill="none"
      />
      <path
        d="M143,53 L144,85 L163,119 L105,166 L159,202 L0,202 L85,111 Z"
        fill={onDark ? "#FFFFFF" : "var(--brand-navy)"}
      />
      <path
        d="M153,53 L218,117 L298,202 L230,202 L141,162 L185,126 Z"
        fill="var(--brand-blue)"
      />
    </svg>
  );
}

/**
 * Single-colour mark, for places that have to sit on a coloured ground — the
 * navy app icon, or the monochrome lockup.
 */
export function BasecampMarkMono({
  className,
  style,
  color = "currentColor",
}: {
  className?: string;
  style?: React.CSSProperties;
  color?: string;
}) {
  return (
    <svg viewBox={VIEWBOX} className={className} style={style} fill="none" aria-hidden="true">
      <path
        d="M95.5,78.9 A55.4,55.4 0 1 1 200.5,78.9"
        stroke={color}
        strokeWidth="11.3"
        fill="none"
        opacity="0.55"
      />
      <path d="M143,53 L144,85 L163,119 L105,166 L159,202 L0,202 L85,111 Z" fill={color} />
      <path
        d="M153,53 L218,117 L298,202 L230,202 L141,162 L185,126 Z"
        fill={color}
        opacity="0.72"
      />
    </svg>
  );
}

/**
 * Mark plus wordmark. `size` drives everything, so the lockup keeps its
 * proportions whether it is the 15px sidebar or the 22px login header.
 */
export function BasecampLockup({
  size = 15,
  tone = "dark",
  className,
}: {
  size?: number;
  tone?: "dark" | "light";
  className?: string;
}) {
  const markHeight = Math.round(size * 1.62);
  return (
    <span
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: Math.round(size * 0.5) }}
    >
      <BasecampMark
        className="shrink-0"
        style={{ height: markHeight, width: Math.round((markHeight * 298) / 202) }}
      />
      <span
        style={{ fontSize: size, lineHeight: 1.1 }}
        className={`font-semibold tracking-[-0.02em] ${tone === "light" ? "text-white" : ""}`}
      >
        Basecamp
      </span>
    </span>
  );
}
