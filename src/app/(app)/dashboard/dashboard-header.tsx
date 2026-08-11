"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  CalendarPlus,
  Plus,
  Search,
  Send,
  Sparkles,
  SquarePen,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuickLog } from "@/components/quick-log";
import { askAssistant } from "./actions";
import type { QuickLogData } from "@/lib/data";

/**
 * Clean, light dashboard header + top action bar. Replaces the old photo hero.
 * White surface, navy text, IMBL-blue accents — no dark banner, no photograph.
 *
 * Lives on the client because it owns the search box, the assistant panel
 * (lifted from the old hero-header) and the QuickLog trigger.
 */
export function DashboardHeader({
  greeting,
  firstName,
  summary,
  aiEnabled,
  quickLog,
}: {
  greeting: string;
  firstName: string | null;
  summary: string;
  aiEnabled: boolean;
  quickLog: QuickLogData;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showAssistant, setShowAssistant] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [assistantError, setAssistantError] = useState<string | null>(null);

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
    router.push(q ? `/lenders?q=${encodeURIComponent(q)}` : "/lenders");
  }

  function handleAsk(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const question = String(new FormData(e.currentTarget).get("question") ?? "");
    setAnswer(null);
    setAssistantError(null);
    startTransition(async () => {
      const result = await askAssistant(question);
      if (result.error) setAssistantError(result.error);
      if (result.answer) setAnswer(result.answer);
    });
  }

  return (
    <section className="mb-5">
      <div className="rounded-[20px] border border-border/80 bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
        {/* Greeting + notifications */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[26px] font-bold leading-[1.1] tracking-[-0.025em] text-foreground sm:text-[30px]">
              {greeting}
              {firstName ? `, ${firstName}` : ""}
            </h1>
            <p className="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-muted">{summary}</p>
          </div>
          <button
            type="button"
            aria-label="Notifications"
            title="Notifications"
            className="relative shrink-0 rounded-[10px] border border-border bg-surface p-2 text-muted transition-colors hover:border-primary/35 hover:bg-primary-soft hover:text-primary"
          >
            <Bell className="h-[18px] w-[18px]" />
          </button>
        </div>

        {/* Action bar */}
        <div className="mt-5 flex flex-col gap-2.5 lg:flex-row lg:items-center">
          <form onSubmit={handleSearch} className="relative min-w-0 flex-1" role="search">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              name="q"
              type="search"
              placeholder="Search lenders…"
              aria-label="Search lenders"
              className="h-10 w-full rounded-[10px] border border-border bg-background pl-9 pr-3 text-[14px] text-foreground outline-none transition-colors placeholder:text-muted/70 focus:border-primary/50 focus:outline-2 focus:outline-offset-0 focus:outline-primary/60"
            />
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="md"
              variant="secondary"
              onClick={() => setShowAssistant((v) => !v)}
              aria-expanded={showAssistant}
            >
              <Sparkles className="h-4 w-4" />
              Ask assistant
            </Button>

            <Link
              href="/lenders/new"
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[10px] bg-primary px-4 text-sm font-medium text-primary-foreground shadow-[0_1px_2px_rgba(24,35,56,0.12)] transition-colors hover:bg-primary-hover"
            >
              <Plus className="h-4 w-4" />
              Add lender
            </Link>

            <QuickLog data={quickLog}>
              {(open) => (
                <Button size="md" variant="secondary" onClick={open}>
                  <SquarePen className="h-4 w-4" />
                  Log activity
                </Button>
              )}
            </QuickLog>

            {/* No calendar page exists yet — Schedule Meeting points at Follow-ups
                so the button is never a dead end. */}
            <Link
              href="/follow-ups"
              title="Scheduling lives under Follow-ups for now"
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[10px] border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:border-primary/35 hover:bg-primary-soft"
            >
              <CalendarPlus className="h-4 w-4" />
              Schedule meeting
            </Link>
          </div>
        </div>

        {/* Assistant panel */}
        {showAssistant && (
          <div className="mt-4 rounded-[14px] border border-border bg-background/60 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[13.5px] font-medium text-foreground">
                Ask about your relationships — who to call, what&apos;s slipping, what to say.
              </p>
              <button
                onClick={() => setShowAssistant(false)}
                className="rounded-md p-1 text-muted transition-colors hover:bg-black/[0.05] hover:text-foreground"
                aria-label="Close assistant"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {aiEnabled ? (
              <form onSubmit={handleAsk} className="mt-3 flex flex-wrap gap-2">
                <input
                  name="question"
                  required
                  placeholder="e.g. Who should I prioritize in Southern Utah this week?"
                  className="min-w-0 flex-1 rounded-[10px] border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted/70 focus:border-primary/50 focus:outline-2 focus:outline-offset-0 focus:outline-primary/60"
                />
                <Button type="submit" size="md" disabled={pending}>
                  <Send className="h-4 w-4" />
                  {pending ? "Thinking…" : "Ask"}
                </Button>
              </form>
            ) : (
              <p className="mt-2 max-w-2xl text-sm text-muted">
                Assistant drafting is off. Add an Anthropic API key in{" "}
                <Link href="/settings" className="font-medium text-primary underline">
                  Settings
                </Link>{" "}
                to switch it on — everything else here works without it.
              </p>
            )}

            {assistantError && (
              <p className="mt-3 rounded-[10px] bg-danger-soft px-3 py-2 text-sm text-danger">
                {assistantError}
              </p>
            )}
            {answer && (
              <div className="mt-3 whitespace-pre-wrap rounded-[12px] border border-border bg-surface px-4 py-3 text-sm leading-relaxed text-foreground shadow-sm">
                {answer}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
