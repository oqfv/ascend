import { describe, expect, it } from "vitest";
import { buildInsights, type InsightInput } from "./insights";

const base: InsightInput = {
  periodLabel: "this week",
  previousLabel: "last week",
  rate: null,
  prevRate: null,
  eligible: 0,
  habits: [],
  targets: [],
  weekdayRates: [],
};

const habit = (name: string, completed: number, eligible: number, prevRate: number | null = null) => ({
  habitId: name,
  name,
  categoryId: null,
  kind: "day" as const,
  eligible,
  completed,
  partial: 0,
  missed: eligible - completed,
  rate: eligible ? (completed / eligible) * 100 : null,
  progressRate: null,
  prevRate,
});

describe("insights", () => {
  it("says nothing without data", () => {
    expect(buildInsights(base)).toEqual([]);
  });
  it("states a rate change with both periods and figures", () => {
    const [i] = buildInsights({ ...base, rate: 80, prevRate: 65, eligible: 20 });
    expect(i.text).toBe("Your completion rate rose from 65% last week to 80% this week.");
  });
  it("ignores changes on tiny samples", () => {
    expect(buildInsights({ ...base, rate: 100, prevRate: 0, eligible: 2 })).toEqual([]);
  });
  it("reports targets in progress with what's left", () => {
    const [i] = buildInsights({
      ...base,
      targets: [{ name: "Gym", actual: 17, target: 20, unit: "sessions", status: "in-progress", daysLeft: 6 }],
    });
    expect(i.text).toBe("Gym: 17 of 20 sessions done, 3 to go with 6 days left.");
  });
  it("names the most consistent and the weakest habit only with enough history", () => {
    const out = buildInsights({ ...base, habits: [habit("Read", 7, 7), habit("Study", 2, 7), habit("Run", 1, 2)] });
    expect(out.map((o) => o.kind)).toEqual(["consistency", "focus"]);
    expect(out[0].text).toContain("Read was your most consistent habit this week: 7 of 7 done.");
  });
});
