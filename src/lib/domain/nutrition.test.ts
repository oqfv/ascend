import { describe, expect, it } from "vitest";
import { portion, restingCalories, share, suggestTargets, sumMacros, type Body } from "./nutrition";

const adult: Body = { sex: "male", birthYear: 2000, heightCm: 180, weightKg: 80, activity: "moderate", goal: "keep" };

describe("restingCalories", () => {
  it("matches the Mifflin–St Jeor formula", () => {
    expect(restingCalories("male", 80, 180, 26)) .toBe(1800);
    expect(restingCalories("female", 60, 165, 30)).toBeCloseTo(1320.25, 2);
  });
});

describe("suggestTargets", () => {
  it("keeps weight at maintenance with 1.6 g protein per kg", () => {
    const t = suggestTargets(adult, 2026);
    expect(t.calories).toBe(2790); // 1800 × 1.55
    expect(t.protein).toBe(128);
    expect(t.notes).toEqual([]);
  });
  it("takes 500 kcal off to lose and raises protein", () => {
    const t = suggestTargets({ ...adult, goal: "lose" }, 2026);
    expect(t.calories).toBe(2290);
    expect(t.protein).toBe(160);
  });
  it("never suggests weight loss under 18", () => {
    const t = suggestTargets({ ...adult, birthYear: 2011, goal: "lose" }, 2026);
    expect(t.calories).toBe(suggestTargets({ ...adult, birthYear: 2011, goal: "keep" }, 2026).calories);
    expect(t.notes[0]).toMatch(/Under 18/);
  });
  it("never goes below the safety floor", () => {
    const t = suggestTargets({ sex: "female", birthYear: 1970, heightCm: 150, weightKg: 45, activity: "sedentary", goal: "lose" }, 2026);
    expect(t.calories).toBeGreaterThanOrEqual(1200);
    expect(t.notes.join(" ")).toMatch(/1200/);
  });
  it("splits the rest between fat and carbs", () => {
    const t = suggestTargets(adult, 2026);
    expect(t.protein * 4 + t.carbs * 4 + t.fat * 9).toBeGreaterThan(t.calories - 15);
    expect(t.protein * 4 + t.carbs * 4 + t.fat * 9).toBeLessThan(t.calories + 15);
  });
});

describe("portion and totals", () => {
  it("scales per-100 g values to the portion", () => {
    expect(portion({ calories: 165, protein: 31, carbs: 0, fat: 3.6 }, 150)).toEqual({ calories: 248, protein: 46.5, carbs: 0, fat: 5.4 });
  });
  it("adds up a day and measures progress against a target", () => {
    const day = sumMacros([{ calories: 300, protein: 20, carbs: 30, fat: 10 }, { calories: 500, protein: 40, carbs: 50, fat: 15 }]);
    expect(day).toEqual({ calories: 800, protein: 60, carbs: 80, fat: 25 });
    expect(share(60, 120)).toBe(0.5);
    expect(share(200, 120)).toBe(1);
    expect(share(10, null)).toBeNull();
  });
});
