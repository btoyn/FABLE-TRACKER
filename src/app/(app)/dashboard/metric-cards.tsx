import Link from "next/link";
import {
  Users,
  AlertCircle,
  CalendarDays,
  Gift,
  Handshake,
  type LucideIcon,
} from "lucide-react";

export interface MetricCard {
  label: string;
  value: number;
  icon: LucideIcon;
  href: string;
  /** Accent token used for the icon chip. */
  tone: "blue" | "danger" | "teal" | "plum" | "gold";
  note?: string;
}

const TONE: Record<MetricCard["tone"], string> = {
  blue: "bg-primary-soft text-primary",
  danger: "bg-danger-soft text-danger",
  teal: "bg-teal-soft text-teal",
  plum: "bg-plum-soft text-plum",
  gold: "bg-gold-soft text-gold",
};

/**
 * Five big-number KPI cards. Each is a full-card link — the whole card is the
 * click/keyboard target, so focus lands on one control per card.
 */
export function MetricCards({
  activeRelationships,
  needingAttention,
  meetingsThisMonth,
  referralsReceived,
  partnersProducing,
}: {
  activeRelationships: number;
  needingAttention: number;
  meetingsThisMonth: number;
  referralsReceived: number;
  partnersProducing: number;
}) {
  const cards: MetricCard[] = [
    {
      label: "Active relationships",
      value: activeRelationships,
      icon: Users,
      href: "/lenders",
      tone: "blue",
      note: "Within contact cadence",
    },
    {
      label: "Needing attention",
      value: needingAttention,
      icon: AlertCircle,
      href: "/needs-attention",
      tone: "danger",
      note: "Past next-contact date",
    },
    {
      label: "Meetings this month",
      value: meetingsThisMonth,
      icon: CalendarDays,
      href: "/follow-ups",
      tone: "teal",
    },
    {
      label: "Referrals received",
      value: referralsReceived,
      icon: Gift,
      href: "/lenders",
      tone: "plum",
      note: "This month",
    },
    {
      label: "Partners producing",
      value: partnersProducing,
      icon: Handshake,
      href: "/lenders",
      tone: "gold",
      note: "Qualified referrals",
    },
  ];

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      {cards.map((card) => (
        <li key={card.label}>
          <Link
            href={card.href}
            className="group flex h-full flex-col justify-between gap-4 rounded-[18px] border border-border/80 bg-surface p-4 shadow-[var(--shadow-card)] transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[var(--shadow-lift)]"
          >
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-[10px] ${TONE[card.tone]}`}
            >
              <card.icon className="h-[18px] w-[18px]" />
            </span>
            <span>
              <span className="block text-[30px] font-bold leading-none tabular-nums text-foreground">
                {card.value}
              </span>
              <span className="mt-1.5 block text-[13px] font-semibold leading-snug text-foreground">
                {card.label}
              </span>
              {card.note && (
                <span className="mt-0.5 block text-[11.5px] text-muted">{card.note}</span>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
