import { cn } from "@/lib/utils";

const TONE_FILL = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
} as const;

export type ProgressTone = keyof typeof TONE_FILL;

export function ProgressBar({
  value,
  tone = "primary",
  className,
  label,
}: {
  /** 0–100. Values outside the range are clamped. */
  value: number;
  tone?: ProgressTone;
  className?: string;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-black/[0.07]", className)}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500", TONE_FILL[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/**
 * Coverage progress ring. Rendered as inline SVG so it works in a server
 * component with no chart dependency.
 */
export function ProgressRing({
  value,
  size = 92,
  strokeWidth = 9,
  label,
  sublabel,
  trackClassName = "stroke-white/25",
  indicatorClassName = "stroke-white",
  className,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  trackClassName?: string;
  indicatorClassName?: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (pct / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        role="img"
        aria-label={`${label ?? "Progress"}: ${pct}%`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={trackClassName}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          className={indicatorClassName}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-xl font-semibold tabular-nums">{pct}%</span>
        {sublabel && <span className="mt-0.5 text-[10px] font-medium opacity-80">{sublabel}</span>}
      </span>
    </div>
  );
}
