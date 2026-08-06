import { cn } from "@/lib/utils";

/**
 * An icon inside a soft tinted circle. Reserved for major section headers and
 * important status indicators — not every small icon in the interface.
 */
const TONES = {
  blue: "bg-primary-soft text-primary",
  gold: "bg-gold-soft text-[#8a6215]",
  teal: "bg-teal-soft text-[#1f6b60]",
  plum: "bg-plum-soft text-[#5e4a85]",
  red: "bg-danger-soft text-[#a8434a]",
  slate: "bg-[#eef1f7] text-[#59678a]",
} as const;

const SIZES = {
  sm: "h-7 w-7 [&>svg]:h-3.5 [&>svg]:w-3.5",
  md: "h-9 w-9 [&>svg]:h-[18px] [&>svg]:w-[18px]",
  lg: "h-11 w-11 [&>svg]:h-5 [&>svg]:w-5",
} as const;

export type IconCircleTone = keyof typeof TONES;

export function IconCircle({
  icon: Icon,
  tone = "blue",
  size = "md",
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone?: IconCircleTone;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full",
        TONES[tone],
        SIZES[size],
        className,
      )}
    >
      <Icon />
    </span>
  );
}

/** Compact month/day tile used by the agenda and the meetings zone. */
export function DateTile({
  date,
  tone = "teal",
  className,
}: {
  date: string | null;
  tone?: "teal" | "gold" | "blue";
  className?: string;
}) {
  const parsed = date ? new Date(date) : null;
  const valid = parsed && !Number.isNaN(parsed.getTime());
  const month = valid
    ? parsed.toLocaleDateString("en-US", { month: "short" }).toUpperCase()
    : "TBD";
  const day = valid ? parsed.getDate() : "—";

  const tones = {
    teal: "border-teal-border bg-teal-soft text-[#1f6b60]",
    gold: "border-gold-border bg-gold-soft text-[#8a6215]",
    blue: "border-[#d5def8] bg-primary-soft text-primary",
  } as const;

  return (
    <div
      className={cn(
        "flex h-[46px] w-[46px] shrink-0 flex-col items-center justify-center rounded-xl border",
        tones[tone],
        className,
      )}
    >
      <span className="text-[9.5px] font-bold uppercase leading-none tracking-[0.1em]">
        {month}
      </span>
      <span className="mt-0.5 text-[17px] font-bold leading-none tabular-nums">{day}</span>
    </div>
  );
}
