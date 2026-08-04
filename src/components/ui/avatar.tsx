import { cn } from "@/lib/utils";

/**
 * Lender initial avatar. Tints come from a restrained blue/slate family so a
 * long list reads as one system rather than a bag of colors.
 */
const TINTS = [
  "bg-[#e6ebfd] text-[#3157d5]",
  "bg-[#e4ecf8] text-[#2c5b8f]",
  "bg-[#e8e9f7] text-[#454b96]",
  "bg-[#e6eaf3] text-[#3d4d75]",
  "bg-[#eceaf6] text-[#4f4d8a]",
  "bg-[#e2edfa] text-[#1f5f9e]",
] as const;

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Stable per-name tint so the same lender always looks the same. */
function tintFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % 9973;
  return TINTS[hash % TINTS.length];
}

const SIZES = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-xs",
  lg: "h-12 w-12 text-sm",
} as const;

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-tight",
        SIZES[size],
        tintFor(name),
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
