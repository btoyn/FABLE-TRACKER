"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/ui/progress";
import { askAssistant, startWeeklyOutreach } from "./actions";

export function WelcomeBanner({
  greeting,
  firstName,
  summary,
  coveragePct,
  coveredCount,
  activeCount,
  hasPlan,
  aiEnabled,
}: {
  greeting: string;
  firstName: string | null;
  summary: string;
  coveragePct: number;
  coveredCount: number;
  activeCount: number;
  hasPlan: boolean;
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showAssistant, setShowAssistant] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [assistantError, setAssistantError] = useState<string | null>(null);

  function handleStart() {
    setError(null);
    startTransition(async () => {
      const result = await startWeeklyOutreach();
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
      document.getElementById("this-week")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
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
    <section className="mb-6 overflow-hidden rounded-[14px] bg-gradient-to-br from-banner-from via-banner-via to-banner-to shadow-[0_2px_8px_rgba(43,79,194,0.18)]">
      <div className="flex flex-col gap-6 px-5 py-6 sm:px-7 sm:py-7 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1 text-white">
          <h1 className="text-[26px] font-semibold leading-tight sm:text-[30px]">
            {greeting}
            {firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-white/85">{summary}</p>

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <Button
              variant="secondary"
              size="md"
              disabled={pending}
              onClick={handleStart}
              className="border-transparent bg-white text-primary shadow-sm hover:bg-white hover:text-primary-hover hover:shadow-md active:bg-white/90"
            >
              {pending ? "Working…" : hasPlan ? "Continue weekly outreach" : "Start weekly outreach"}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="md"
              onClick={() => setShowAssistant((v) => !v)}
              className="border border-white/30 text-white hover:bg-white/15 active:bg-white/25"
            >
              <Sparkles className="h-4 w-4" />
              Ask assistant
            </Button>
          </div>

          {error && (
            <p className="mt-3 rounded-lg bg-white/15 px-3 py-2 text-sm text-white">{error}</p>
          )}
        </div>

        {/* Personal coverage ring */}
        <div className="flex shrink-0 items-center gap-4 lg:flex-col lg:gap-2">
          <ProgressRing
            value={coveragePct}
            size={104}
            strokeWidth={10}
            label="Personal coverage"
            className="text-white"
          />
          <div className="text-white lg:text-center">
            <p className="text-sm font-semibold">Personal coverage</p>
            <p className="text-xs text-white/75">
              {coveredCount} of {activeCount} lenders
            </p>
          </div>
        </div>
      </div>

      {showAssistant && (
        <div className="border-t border-white/20 bg-black/10 px-5 py-4 sm:px-7">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-white">
              Ask about your relationships — who to call, what&apos;s slipping, what to say.
            </p>
            <button
              onClick={() => setShowAssistant(false)}
              className="rounded-md p-1 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
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
                className="min-w-0 flex-1 rounded-lg border border-white/25 bg-white/95 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-2 focus:outline-offset-2 focus:outline-white"
              />
              <Button
                type="submit"
                variant="secondary"
                size="md"
                disabled={pending}
                className="border-transparent bg-white text-primary hover:bg-white hover:text-primary-hover"
              >
                <Send className="h-4 w-4" />
                {pending ? "Thinking…" : "Ask"}
              </Button>
            </form>
          ) : (
            <p className="mt-2 text-sm text-white/85">
              Assistant drafting is off. Add an Anthropic API key in{" "}
              <Link href="/settings" className="font-medium text-white underline">
                Settings
              </Link>{" "}
              to switch it on — every other part of this dashboard works without it.
            </p>
          )}

          {assistantError && (
            <p className="mt-3 rounded-lg bg-white/15 px-3 py-2 text-sm text-white">
              {assistantError}
            </p>
          )}
          {answer && (
            <div className="mt-3 whitespace-pre-wrap rounded-lg bg-white px-3.5 py-3 text-sm leading-relaxed text-foreground shadow-sm">
              {answer}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
