import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** Controls sit at the tightest radius tier — border or fill, never a shadow
 *  beyond the primary action's slight lift. */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-[10px] font-medium transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary whitespace-nowrap active:translate-y-px",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-[0_1px_2px_rgba(24,35,56,0.12)] hover:bg-primary-hover active:shadow-none",
        secondary:
          "bg-surface text-foreground border border-border hover:border-primary/35 hover:bg-primary-soft active:bg-primary-soft/80",
        quiet:
          "text-muted hover:bg-primary-soft hover:text-primary active:bg-primary-soft/80",
        ghost: "text-foreground hover:bg-black/[0.04] active:bg-black/[0.07]",
        danger: "bg-danger text-white hover:bg-danger/90 active:bg-danger",
        gold: "bg-gold text-white hover:bg-[#b47d16] active:bg-gold",
        link: "text-primary underline-offset-4 hover:underline active:translate-y-0",
      },
      size: {
        xs: "h-7 px-2.5 text-[12.5px]",
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-11 px-5 text-base",
        /** Meets the 44px touch target on phones, tightens up on desktop. */
        touch: "h-11 px-4 text-sm sm:h-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
