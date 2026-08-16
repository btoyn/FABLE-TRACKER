import { describe, expect, it } from "vitest";
import { daysLateFrom, loanState } from "../loan-cadence";

describe("loanState", () => {
  it("is up to date while the due date is still ahead", () => {
    expect(loanState(-1, true)).toBe("updated");
    expect(loanState(-7, true)).toBe("updated");
  });

  it("is due the day it comes up", () => {
    expect(loanState(0, true)).toBe("due");
  });

  it("stays merely due through the first week past", () => {
    expect(loanState(1, true)).toBe("due");
    expect(loanState(7, true)).toBe("due");
  });

  it("turns overdue on the eighth day", () => {
    expect(loanState(8, true)).toBe("overdue");
    expect(loanState(30, true)).toBe("overdue");
  });

  it("says nothing at all once you've marked it done", () => {
    expect(loanState(0, false)).toBe("closed");
    expect(loanState(99, false)).toBe("closed");
  });
});

describe("daysLateFrom", () => {
  it("counts whole days only", () => {
    const due = new Date(2026, 7, 10, 0, 0);
    expect(daysLateFrom(due, new Date(2026, 7, 10, 23, 59))).toBe(0);
    expect(daysLateFrom(due, new Date(2026, 7, 11, 0, 1))).toBe(1);
  });

  it("goes negative before the due date", () => {
    const due = new Date(2026, 7, 20);
    expect(daysLateFrom(due, new Date(2026, 7, 18))).toBe(-2);
  });

  it("a loan logged today lands a week out and reads as up to date", () => {
    const today = new Date(2026, 7, 12);
    const nextDue = new Date(today.getTime() + 7 * 86_400_000);
    expect(loanState(daysLateFrom(nextDue, today), true)).toBe("updated");
  });

  it("that same loan comes due exactly seven days later", () => {
    const nextDue = new Date(2026, 7, 19);
    expect(loanState(daysLateFrom(nextDue, new Date(2026, 7, 19)), true)).toBe("due");
  });
});
