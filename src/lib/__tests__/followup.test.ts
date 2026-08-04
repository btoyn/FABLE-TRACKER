import { describe, expect, it } from "vitest";
import { nextFollowUpStep, MAX_FOLLOW_UP_ATTEMPTS } from "../followup";

const SENT = new Date("2026-08-01T00:00:00Z");
const day = (n: number) => new Date(SENT.getTime() + n * 86_400_000);

describe("Sources & Uses follow-up sequence (spec §25)", () => {
  it("first follow-up is a casual check-in at day 7", () => {
    const step = nextFollowUpStep(SENT, 0);
    expect(step).toMatchObject({ kind: "follow_up", attempt: 1 });
    if (step.kind === "follow_up") {
      expect(step.dueAt).toEqual(day(7));
      expect(step.tone).toMatch(/casual/i);
    }
  });

  it("second follow-up asks if the deal is active at day 14", () => {
    const step = nextFollowUpStep(SENT, 1);
    expect(step).toMatchObject({ kind: "follow_up", attempt: 2 });
    if (step.kind === "follow_up") {
      expect(step.dueAt).toEqual(day(14));
      expect(step.tone).toMatch(/active/i);
    }
  });

  it("third follow-up is the final close-for-now at day 21", () => {
    const step = nextFollowUpStep(SENT, 2);
    expect(step).toMatchObject({ kind: "follow_up", attempt: 3 });
    if (step.kind === "follow_up") {
      expect(step.dueAt).toEqual(day(21));
      expect(step.tone).toMatch(/final/i);
    }
  });

  it("stops after 3 unanswered follow-ups and goes dormant", () => {
    expect(nextFollowUpStep(SENT, MAX_FOLLOW_UP_ATTEMPTS)).toEqual({ kind: "go_dormant" });
    expect(nextFollowUpStep(SENT, 5)).toEqual({ kind: "go_dormant" });
  });

  it("accepts ISO strings", () => {
    const step = nextFollowUpStep(SENT.toISOString(), 0);
    if (step.kind === "follow_up") expect(step.dueAt).toEqual(day(7));
  });
});
