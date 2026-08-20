import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { CoverageStatus } from "@/lib/coverage";
import { COVERAGE_LABELS } from "@/lib/coverage";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full text-xs font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        /* Pill text runs a shade darker than the pure semantic hue — the brand
           values sit near 3:1 on their own tints, which is thin for 12px type. */
        default: "bg-primary-soft text-[#1a4ad9]",
        success: "bg-teal-soft text-[#1f6b60]",
        warning: "bg-gold-soft text-[#8a6215]",
        danger: "bg-danger-soft text-[#a8434a]",
        muted: "bg-black/[0.04] text-muted",
        outline: "border border-border text-muted",

        /* Pale pill set: overdue timing, meeting type, territory, pending, planning, personal */
        overdue: "bg-danger-soft text-[#a8434a]",
        meeting: "bg-primary-soft text-[#1a4ad9]",
        territory: "bg-[#eef1f7] text-[#59678a]",
        pending: "bg-gold-soft text-[#8a6215]",
        planning: "bg-gold-soft text-[#8a6215]",
        personal: "bg-plum-soft text-[#5e4a85]",
      },
      size: {
        sm: "px-2 py-0.5",
        md: "px-2.5 py-[3px]",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

const COVERAGE_VARIANT: Record<CoverageStatus, BadgeProps["variant"]> = {
  on_track: "success",
  grace: "warning",
  overdue: "overdue",
  seriously_overdue: "overdue",
  never_contacted: "muted",
};

export function CoverageBadge({ status, className }: { status: CoverageStatus; className?: string }) {
  return (
    <Badge variant={COVERAGE_VARIANT[status]} className={className}>
      {COVERAGE_LABELS[status]}
    </Badge>
  );
}

export function SampleBadge() {
  return (
    <Badge variant="outline" className="border-dashed">
      Sample
    </Badge>
  );
}
