import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { CoverageStatus } from "@/lib/coverage";
import { COVERAGE_LABELS } from "@/lib/coverage";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full text-xs font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-primary-soft text-primary",
        success: "bg-success-soft text-success",
        warning: "bg-warning-soft text-warning",
        danger: "bg-danger-soft text-danger",
        muted: "bg-black/[0.04] text-muted",
        outline: "border border-border text-muted",

        /* Pale pill set: overdue timing, meeting type, territory, brief status, trip planning */
        overdue: "bg-[#fdecea] text-[#a8382f]",
        meeting: "bg-[#eaf0fe] text-[#2c4fbd]",
        territory: "bg-[#eef1f7] text-[#5a6884]",
        pending: "bg-[#fdf3e0] text-[#96650b]",
        planning: "bg-[#faf3e3] text-[#9a7526]",
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
