"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Landmark,
  CheckSquare,
  AlertCircle,
  Settings,
  Trash2,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavCounts } from "@/lib/data";

/** Import lives in Settings now, not primary navigation (§8). */
const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, count: null },
  { href: "/lenders", label: "Lenders", icon: Users, count: null },
  { href: "/institutions", label: "Institutions", icon: Landmark, count: null },
  { href: "/follow-ups", label: "Follow-ups", icon: CheckSquare, count: "followUps" },
  { href: "/needs-attention", label: "Needs Attention", icon: AlertCircle, count: "needsAttention" },
] as const;

const FOOTER_NAV = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/trash", label: "Trash", icon: Trash2 },
];

// Mobile priorities (spec §5): search lender, today's priorities, follow-ups, add
const MOBILE_NAV = [
  { href: "/dashboard", label: "Today", icon: LayoutDashboard },
  { href: "/lenders", label: "Lenders", icon: Users },
  { href: "/lenders/new", label: "Add", icon: Plus },
  { href: "/follow-ups", label: "Follow-ups", icon: CheckSquare },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  count,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  count?: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-white shadow-sm"
          : "text-foreground/70 hover:bg-white hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count !== undefined && count > 0 && (
        <span
          className={cn(
            "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
            active ? "bg-white/20 text-white" : "bg-primary-soft text-primary",
          )}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

export function AppShell({
  children,
  userEmail,
  counts,
}: {
  children: React.ReactNode;
  userEmail?: string;
  counts?: NavCounts;
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <div className="flex min-h-screen w-full">
      {/* Desktop sidebar — compact, subtle blue-gray (§8) */}
      <aside className="sticky top-0 hidden h-screen w-52 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-2.5 py-4 md:flex">
        <Link href="/dashboard" className="mb-5 flex items-center gap-2 px-1.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white shadow-sm">
            LC
          </span>
          <span className="text-[15px] font-semibold tracking-tight">Lender CRM</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-0.5">
          {NAV.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isActive(item.href)}
              count={item.count ? counts?.[item.count] : undefined}
            />
          ))}
        </nav>
        <div className="flex flex-col gap-0.5 border-t border-sidebar-border pt-3">
          {FOOTER_NAV.map((item) => (
            <NavLink key={item.href} {...item} active={isActive(item.href)} />
          ))}
          {userEmail && (
            <p className="truncate px-2.5 pt-2 text-xs text-muted" title={userEmail}>
              {userEmail}
            </p>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="min-w-0 flex-1 pb-20 md:pb-0">
        <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-8">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        {MOBILE_NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors active:bg-black/5",
              isActive(href) && href !== "/lenders/new" ? "text-primary" : "text-muted",
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
            {href === "/follow-ups" && (counts?.followUps ?? 0) > 0 && (
              <span className="absolute right-[22%] top-1 h-1.5 w-1.5 rounded-full bg-primary" />
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}
