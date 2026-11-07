// Nutrition maths: suggested daily targets from body details, and day totals. Pure functions only.
// Targets are estimates for healthy adults, not medical advice; the page says so.

import type { ISODate } from "./dates";

export type Sex = "male" | "female";
export type Activity = "sedentary" | "light" | "moderate" | "active" | "very";
export type Goal = "lose" | "keep" | "gain";

export const ACTIVITY: { value: Activity; label: string; factor: number }[] = [
  { value: "sedentary", label: "Mostly sitting, little exercise", factor: 1.2 },
  { value: "light", label: "Light exercise 1–3 days a week", factor: 1.375 },
  { value: "moderate", label: "Exercise 3–5 days a week", factor: 1.55 },
  { value: "active", label: "Hard exercise 6–7 days a week", factor: 1.725 },
  { value: "very", label: "Physical job or training twice a day", factor: 1.9 },
];

export const GOALS: { value: Goal; label: string }[] = [
  { value: "lose", label: "Lose weight" },
  { value: "keep", label: "Stay the same" },
  { value: "gain", label: "Gain muscle" },
];

/** Below these, Ascend won't suggest a daily target without a professional's guidance. */
export const CALORIE_FLOOR: Record<Sex, number> = { male: 1500, female: 1200 };

export interface Body {
  sex: Sex;
  birthYear: number;
  heightCm: number;
  weightKg: number;
  activity: Activity;
  goal: Goal;
}

export interface Targets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  /** Plain sentences explaining any adjustment Ascend made. */
  notes: string[];
}

export const ageIn = (birthYear: number, year: number) => year - birthYear;

/** Resting energy use per day (Mifflin–St Jeor). */
export function restingCalories(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === "male" ? 5 : -161);
}

export function suggestTargets(b: Body, currentYear: number): Targets {
  const notes: string[] = [];
  const age = ageIn(b.birthYear, currentYear);
  const factor = ACTIVITY.find((a) => a.value === b.activity)?.factor ?? 1.2;
  const maintenance = restingCalories(b.sex, b.weightKg, b.heightCm, age) * factor;

  let goal = b.goal;
  if (age < 18 && goal === "lose") {
    goal = "keep";
    notes.push("Under 18, Ascend suggests eating enough to maintain your weight. Talk to a doctor before trying to lose weight.");
  }
  let calories = maintenance + (goal === "lose" ? -500 : goal === "gain" ? 300 : 0);
  if (goal === "lose" && calories < CALORIE_FLOOR[b.sex]) {
    calories = Math.max(CALORIE_FLOOR[b.sex], Math.min(maintenance, CALORIE_FLOOR[b.sex]));
    notes.push(`Ascend doesn't suggest less than ${CALORIE_FLOOR[b.sex]} kcal a day. Ask a professional for a lower target.`);
  }
  calories = Math.round(calories / 10) * 10;

  // Protein per kg of body weight: more while losing (to keep muscle) or building.
  const perKg = goal === "lose" ? 2.0 : goal === "gain" ? 1.8 : 1.6;
  const protein = Math.round(b.weightKg * perKg);
  const fat = Math.round((calories * 0.25) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  return { calories, protein, carbs, fat, notes };
}

export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export const ZERO: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0 };

export function sumMacros(items: Macros[]): Macros {
  return items.reduce((a, m) => ({ calories: a.calories + m.calories, protein: a.protein + m.protein, carbs: a.carbs + m.carbs, fat: a.fat + m.fat }), { ...ZERO });
}

/** Totals for a portion of a food described per 100 g. */
export function portion(per100: Macros, grams: number): Macros {
  const k = grams / 100;
  const r = (v: number) => Math.round(v * k * 10) / 10;
  return { calories: Math.round(per100.calories * k), protein: r(per100.protein), carbs: r(per100.carbs), fat: r(per100.fat) };
}

/** Daily water goal: the user's own, or about 35 ml per kg of body weight, rounded to a glass (250 ml). */
export function waterTarget(own: number | null | undefined, weightKg: number | null | undefined): number {
  if (own) return own;
  if (!weightKg) return 2000;
  return Math.min(4000, Math.max(1500, Math.round((weightKg * 35) / 250) * 250));
}

/** Share of a target reached, 0–1, capped; null when there is no target. */
export function share(value: number, target: number | null | undefined): number | null {
  if (!target || target <= 0) return null;
  return Math.min(1, value / target);
}

/**
 * "On target" for a day: calories within 10% of the target either way, and the protein target reached.
 * A day with nothing logged is never on target.
 */
export function onTarget(eaten: { calories: number; protein: number }, target: { calories: number; protein: number }): boolean {
  if (eaten.calories <= 0 || target.calories <= 0) return false;
  return Math.abs(eaten.calories - target.calories) <= target.calories * 0.1 && eaten.protein >= target.protein;
}

export interface NutritionDay {
  date: ISODate;
  calories: number;
  protein: number;
  waterMl: number;
  logged: boolean; // any food logged that day
}

export interface NutritionSummary {
  days: NutritionDay[];
  loggedDays: number;
  avgCalories: number | null;
  avgProtein: number | null;
  /** Days on target, out of logged days; null without targets. */
  onTargetDays: number | null;
  waterDays: number;
  avgWaterMl: number | null;
  waterGoalDays: number;
  weights: { date: ISODate; kg: number }[];
  weightFirst: { date: ISODate; kg: number } | null;
  weightLast: { date: ISODate; kg: number } | null;
}

/**
 * A period's eating, drinking and weight, measured against the user's current targets.
 * Averages are over days that have something logged, so unlogged days don't drag them to zero.
 */
export function summarizeNutrition(input: {
  dates: ISODate[];
  food: Map<ISODate, { calories: number; protein: number }>;
  water: Map<ISODate, number>;
  weights: { date: ISODate; kg: number }[];
  targets: { calories: number; protein: number } | null;
  waterTargetMl: number;
}): NutritionSummary {
  const days: NutritionDay[] = input.dates.map((date) => {
    const f = input.food.get(date);
    return { date, calories: Math.round(f?.calories ?? 0), protein: Math.round(f?.protein ?? 0), waterMl: input.water.get(date) ?? 0, logged: Boolean(f && f.calories > 0) };
  });
  const logged = days.filter((d) => d.logged);
  const watered = days.filter((d) => d.waterMl > 0);
  const mean = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
  const weights = [...input.weights].filter((w) => input.dates.includes(w.date)).sort((a, b) => a.date.localeCompare(b.date));
  return {
    days,
    loggedDays: logged.length,
    avgCalories: mean(logged.map((d) => d.calories)),
    avgProtein: mean(logged.map((d) => d.protein)),
    onTargetDays: input.targets ? logged.filter((d) => onTarget(d, input.targets!)).length : null,
    waterDays: watered.length,
    avgWaterMl: mean(watered.map((d) => d.waterMl)),
    waterGoalDays: watered.filter((d) => d.waterMl >= input.waterTargetMl).length,
    weights,
    weightFirst: weights[0] ?? null,
    weightLast: weights.length > 1 ? weights[weights.length - 1] : null,
  };
}

/** True when a period has anything nutrition-related worth showing. */
export const hasNutrition = (s: NutritionSummary) => s.loggedDays > 0 || s.waterDays > 0 || s.weightFirst !== null;

/** The period in plain sentences, for the monthly review and the monthly email. */
export function nutritionLines(s: NutritionSummary): string[] {
  const out: string[] = [];
  const total = s.days.length;
  if (s.loggedDays > 0) {
    out.push(`You logged food on ${s.loggedDays} of ${total} ${total === 1 ? "day" : "days"}, averaging ${s.avgCalories!.toLocaleString("en-US")} kcal and ${s.avgProtein} g protein.`);
    if (s.onTargetDays !== null)
      out.push(s.loggedDays === 1 ? (s.onTargetDays ? "That day was on target." : "That day wasn't on target.") : `You were on target on ${s.onTargetDays} of those ${s.loggedDays} days.`);
  }
  if (s.waterDays > 0) {
    const l = (s.avgWaterMl! / 1000).toFixed(2).replace(/0$/, "");
    out.push(
      s.waterGoalDays === 0
        ? `You didn't reach your water goal, averaging ${l} L on days you logged water.`
        : `You reached your water goal on ${s.waterGoalDays} ${s.waterGoalDays === 1 ? "day" : "days"}, averaging ${l} L on days you logged water.`,
    );
  }
  if (s.weightFirst && s.weightLast) {
    const diff = Math.round((s.weightLast.kg - s.weightFirst.kg) * 10) / 10;
    out.push(diff === 0 ? `Your weight held at ${s.weightLast.kg} kg.` : `Your weight went from ${s.weightFirst.kg} kg to ${s.weightLast.kg} kg (${diff > 0 ? "+" : "−"}${Math.abs(diff)} kg).`);
  } else if (s.weightFirst) {
    out.push(`You weighed in once, at ${s.weightFirst.kg} kg.`);
  }
  return out;
}
