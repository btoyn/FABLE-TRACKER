import { describe, expect, it } from "vitest";
import { describeSlot, draftProposalEmail, findOpenSlots } from "../scheduling";

// A Wednesday, so "tomorrow" is a Thursday and weekday maths is easy to follow.
const NOW = new Date(2026, 7, 12, 9, 0); // Wed 12 Aug 2026, 9:00 local

const LUNCH = {
  meetingType: "lunch",
  weekdays: [2, 4], // Tuesday, Thursday
  startMinute: 11 * 60,
  endMinute: 13 * 60,
};

describe("findOpenSlots (spec §15)", () => {
  it("offers dates only on the allowed weekdays", () => {
    const slots = findOpenSlots({
      rule: LUNCH,
      durationMinutes: 60,
      busy: [],
      horizonDays: 14,
      count: 2,
      now: NOW,
    });
    expect(slots).toHaveLength(2);
    for (const s of slots) expect([2, 4]).toContain(s.getDay());
  });

  it("centers the meeting in the window", () => {
    // 60 minutes inside 11:00–13:00 leaves an hour of slack, so it lands at 11:30.
    const [first] = findOpenSlots({
      rule: LUNCH,
      durationMinutes: 60,
      busy: [],
      horizonDays: 14,
      count: 1,
      now: NOW,
    });
    expect(first.getHours()).toBe(11);
    expect(first.getMinutes()).toBe(30);
  });

  it("never offers two times on the same day", () => {
    const slots = findOpenSlots({
      rule: LUNCH,
      durationMinutes: 60,
      busy: [],
      horizonDays: 14,
      count: 3,
      now: NOW,
    });
    const days = slots.map((s) => s.toDateString());
    expect(new Set(days).size).toBe(days.length);
  });

  it("skips slots that collide with something already booked", () => {
    const thursday = new Date(2026, 7, 13, 11, 30);
    const slots = findOpenSlots({
      rule: LUNCH,
      durationMinutes: 60,
      busy: [{ start: thursday, end: new Date(2026, 7, 13, 13, 0) }],
      horizonDays: 14,
      count: 1,
      now: NOW,
    });
    // Thursday the 13th is full to the end of the window, so it moves on.
    expect(slots[0].toDateString()).not.toBe(thursday.toDateString());
  });

  it("steps forward within the window when only part of it is taken", () => {
    const slots = findOpenSlots({
      rule: LUNCH,
      durationMinutes: 60,
      busy: [{ start: new Date(2026, 7, 13, 11, 0), end: new Date(2026, 7, 13, 12, 0) }],
      horizonDays: 14,
      count: 1,
      now: NOW,
    });
    expect(slots[0].getDate()).toBe(13);
    expect(slots[0].getHours()).toBe(12);
  });

  it("never proposes today", () => {
    const wednesdayRule = { ...LUNCH, weekdays: [0, 1, 2, 3, 4, 5, 6] };
    const [first] = findOpenSlots({
      rule: wednesdayRule,
      durationMinutes: 60,
      busy: [],
      horizonDays: 14,
      count: 1,
      now: NOW,
    });
    expect(first.getDate()).toBeGreaterThan(NOW.getDate());
  });

  it("returns nothing when the meeting cannot fit the window", () => {
    const slots = findOpenSlots({
      rule: LUNCH,
      durationMinutes: 150, // a round of golf inside a two-hour lunch window
      busy: [],
      horizonDays: 14,
      count: 2,
      now: NOW,
    });
    expect(slots).toEqual([]);
  });

  it("returns nothing when no weekdays are set", () => {
    const slots = findOpenSlots({
      rule: { ...LUNCH, weekdays: [] },
      durationMinutes: 60,
      busy: [],
      horizonDays: 14,
      count: 2,
      now: NOW,
    });
    expect(slots).toEqual([]);
  });

  it("runs out of dates rather than reaching past the horizon", () => {
    const slots = findOpenSlots({
      rule: LUNCH,
      durationMinutes: 60,
      busy: [],
      horizonDays: 3, // Thu 13th only
      count: 2,
      now: NOW,
    });
    expect(slots).toHaveLength(1);
  });
});

describe("describeSlot", () => {
  it("reads the way someone would say it", () => {
    expect(describeSlot(new Date(2026, 7, 13, 11, 30))).toBe("Thursday the 13th at 11:30am");
  });

  it("drops the :00 on the hour", () => {
    expect(describeSlot(new Date(2026, 7, 18, 12, 0))).toBe("Tuesday the 18th at 12pm");
  });

  it("handles the 1st, 2nd, 3rd and the teens", () => {
    expect(describeSlot(new Date(2026, 8, 1, 12, 0))).toContain("the 1st");
    expect(describeSlot(new Date(2026, 8, 2, 12, 0))).toContain("the 2nd");
    expect(describeSlot(new Date(2026, 8, 3, 12, 0))).toContain("the 3rd");
    expect(describeSlot(new Date(2026, 8, 11, 12, 0))).toContain("the 11th");
  });
});

describe("draftProposalEmail", () => {
  const slots = [new Date(2026, 7, 13, 11, 30), new Date(2026, 7, 18, 11, 30)];

  it("offers both dates in one sentence", () => {
    const { body } = draftProposalEmail({
      firstName: "Joe",
      meetingType: "lunch",
      slots,
      daysSinceContact: 40,
    });
    expect(body).toContain("Hey Joe");
    expect(body).toContain("Thursday the 13th at 11:30am or Tuesday the 18th at 11:30am");
    expect(body).toContain("I'll send an invite");
  });

  it("only says it's been too long when it has", () => {
    const recent = draftProposalEmail({
      firstName: "Joe",
      meetingType: "lunch",
      slots,
      daysSinceContact: 12,
    });
    expect(recent.body).toContain("hope you're doing well");

    const stale = draftProposalEmail({
      firstName: "Joe",
      meetingType: "lunch",
      slots,
      daysSinceContact: 200,
    });
    expect(stale.body).toContain("it's been too long");
  });

  it("uses the name he gave an 'other' meeting", () => {
    const { body, subject } = draftProposalEmail({
      firstName: "Joe",
      meetingType: "general",
      customLabel: "a ballgame",
      slots,
      daysSinceContact: null,
    });
    expect(body).toContain("overdue for a ballgame");
    expect(subject).toBe("A ballgame?");
  });

  it("still writes something when no dates could be found", () => {
    const { body } = draftProposalEmail({
      firstName: "Joe",
      meetingType: "lunch",
      slots: [],
      daysSinceContact: null,
    });
    expect(body).toContain("sometime in the next couple of weeks");
  });
});
