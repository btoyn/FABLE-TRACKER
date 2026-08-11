import Link from "next/link";
import { AlertCircle, CalendarDays, HandCoins, Star, Users } from "lucide-react";

/**
 * Five KPI cards, shown directly under the hero. Purely presentational — the
 * page computes the numbers and passes them in. Each card is a keyboard-
 * accessible link into the list behind the number.
 */
const ICONS = {
  active: Users,
  attention: AlertCircle,
  meetings: CalendarDays,
  looks: HandCoins,
  partners: Star,
} as const;

const TONE = {
  blue: "bg-primary-soft text-primary",
  danger: "bg-danger-soft text-[#a8434a]",
  plum: "bg-plum-soft text-plum",
  gold: "bg-gold-soft text-[#8a6215]",
  teal: "bg-teal-soft text-teal",
} as const;

export interface Metric {
  label: string;
  value: number;
  href: string;
  icon: keyof typeof ICONS;
  tone: keyof typeof TONE;
}

export function MetricCards({ metrics }: { metrics: Metric[] }) {
  return (
    <section
      aria-label="Key metrics"
      className="mb-5 grid grid-cols-2 gap-3 sm:max-w-xl"
    >
      {metrics.map((m) => {
        const Icon = ICONS[m.icon];
        return (
          <Link
            key={m.label}
            href={m.href}
            className="group rounded-2xl border border-border/80 bg-surface p-4 shadow-[var(--shadow-card)] transition-colors hover:border-primary/30"
          >
            <span
              className={`inline-flex h-8 w-8 items-center justify-center rounded-[10px] ${TONE[m.tone]}`}
            >
              <Icon className="h-[17px] w-[17px]" />
            </span>
            <div className="mt-3 text-[26px] font-bold leading-none tracking-[-0.02em] text-foreground tabular-nums">
              {m.value}
            </div>
            <div className="mt-1.5 text-[12.5px] font-medium leading-snug text-muted">{m.label}</div>
          </Link>
        );
      })}
    </section>
  );
}
