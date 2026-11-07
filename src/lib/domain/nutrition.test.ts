import { describe, expect, it } from "vitest";
import { hasNutrition, nutritionLines, onTarget, portion, summarizeNutrition, restingCalories, share, suggestTargets, sumMacros, waterTarget, type Body } from "./nutrition";

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

describe("onTarget", () => {
  const target = { calories: 2000, protein: 150 };
  it("needs calories within 10% and the protein reached", () => {
    expect(onTarget({ calories: 2000, protein: 150 }, target)).toBe(true);
    expect(onTarget({ calories: 1800, protein: 160 }, target)).toBe(true);
    expect(onTarget({ calories: 2200, protein: 150 }, target)).toBe(true);
  });
  it("misses when calories are too far off or protein is short", () => {
    expect(onTarget({ calories: 1799, protein: 150 }, target)).toBe(false);
    expect(onTarget({ calories: 2201, protein: 150 }, target)).toBe(false);
    expect(onTarget({ calories: 2000, protein: 149 }, target)).toBe(false);
    expect(onTarget({ calories: 0, protein: 0 }, { calories: 0, protein: 0 })).toBe(false);
  });
});

describe("waterTarget", () => {
  it("uses the user's own goal, else about 35 ml per kg in glasses, within limits", () => {
    expect(waterTarget(3000, 70)).toBe(3000);
    expect(waterTarget(null, 72.4)).toBe(2500);
    expect(waterTarget(null, 30)).toBe(1500);
    expect(waterTarget(null, 200)).toBe(4000);
    expect(waterTarget(null, null)).toBe(2000);
  });
});

describe("summarizeNutrition", () => {
  const dates = ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"];
  const s = summarizeNutrition({
    dates,
    food: new Map([
      ["2026-10-01", { calories: 2000, protein: 150 }],
      ["2026-10-02", { calories: 2500, protein: 100 }],
    ]),
    water: new Map([
      ["2026-10-01", 2500],
      ["2026-10-03", 1000],
    ]),
    weights: [
      { date: "2026-10-04", kg: 79.2 },
      { date: "2026-10-01", kg: 80 },
      { date: "2026-09-20", kg: 82 },
    ],
    targets: { calories: 2000, protein: 150 },
    waterTargetMl: 2500,
  });
  it("averages over logged days only", () => {
    expect(s.loggedDays).toBe(2);
    expect(s.avgCalories).toBe(2250);
    expect(s.avgProtein).toBe(125);
    expect(s.onTargetDays).toBe(1);
  });
  it("counts water and weight inside the period", () => {
    expect(s.waterDays).toBe(2);
    expect(s.avgWaterMl).toBe(1750);
    expect(s.waterGoalDays).toBe(1);
    expect(s.weightFirst).toEqual({ date: "2026-10-01", kg: 80 });
    expect(s.weightLast).toEqual({ date: "2026-10-04", kg: 79.2 });
  });
  it("has no on-target count without targets", () => {
    const empty = summarizeNutrition({ dates, food: new Map(), water: new Map(), weights: [], targets: null, waterTargetMl: 2000 });
    expect(empty.onTargetDays).toBeNull();
    expect(empty.avgCalories).toBeNull();
    expect(hasNutrition(empty)).toBe(false);
  });
});

describe("nutritionLines", () => {
  it("says the period in plain sentences", () => {
    const s = summarizeNutrition({
      dates: ["2026-10-01", "2026-10-02"],
      food: new Map([["2026-10-01", { calories: 2000, protein: 150 }]]),
      water: new Map([["2026-10-02", 3000]]),
      weights: [{ date: "2026-10-01", kg: 80 }, { date: "2026-10-02", kg: 79.6 }],
      targets: { calories: 2000, protein: 150 },
      waterTargetMl: 2500,
    });
    expect(nutritionLines(s)).toEqual([
      "You logged food on 1 of 2 days, averaging 2,000 kcal and 150 g protein.",
      "That day was on target.",
      "You reached your water goal on 1 day, averaging 3.0 L on days you logged water.",
      "Your weight went from 80 kg to 79.6 kg (−0.4 kg).",
    ]);
  });
});
