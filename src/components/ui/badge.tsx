import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { CoverageStatus } from "@/lib/coverage";
import { COVERAGE_LABELS } from "@/lib/coverage";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary-soft text-primary",
        success: "bg-success-soft text-success",
        warning: "bg-warning-soft text-warning",
        danger: "bg-danger-soft text-danger",
        muted: "bg-black/5 text-muted",
        outline: "border border-border text-muted",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

const COVERAGE_VARIANT: Record<CoverageStatus, BadgeProps["variant"]> = {
  on_track: "success",
  grace: "warning",
  overdue: "danger",
  seriously_overdue: "danger",
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
