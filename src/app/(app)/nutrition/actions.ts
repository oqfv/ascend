"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { isISODate, toDbDate } from "@/lib/domain/dates";
import { ageIn, portion, suggestTargets } from "@/lib/domain/nutrition";
import { searchFoods, type FoodResult } from "@/lib/food-search";
import { allow } from "@/lib/rate-limit";
import { requireUser } from "@/lib/session";

const WELCOME_SKIPPED = "nutrition_welcome_skipped";

export async function skipNutritionWelcome() {
  await requireUser();
  (await cookies()).set(WELCOME_SKIPPED, "1", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
}

export type FoodSearchResult = { ok: true; results: FoodResult[]; partial: boolean } | { ok: false; error: string };

export async function searchFood(query: string): Promise<FoodSearchResult> {
  const user = await requireUser();
  const q = String(query ?? "").trim();
  if (q.length < 2) return { ok: false, error: "Type at least 2 letters." };
  if (q.length > 80) return { ok: false, error: "Use at most 80 characters." };
  // The free databases have their own limits; this keeps one account from using them all up.
  if (!(await allow(`food-search:${user.id}`, 40, 5 * 60))) return { ok: false, error: "Too many searches. Wait a few minutes and try again." };
  try {
    const { results, partial } = await searchFoods(q);
    return { ok: true, results, partial };
  } catch {
    return { ok: false, error: "Food search isn't responding. Try again, or type the food in yourself." };
  }
}

const macros = z.object({
  calories: z.number().min(0).max(20000),
  protein: z.number().min(0).max(2000),
  carbs: z.number().min(0).max(2000),
  fat: z.number().min(0).max(2000),
});

const foodInput = z
  .object({
    date: z.string().refine(isISODate),
    meal: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]),
    name: z.string().trim().min(1, "Name the food.").max(120, "Use at most 120 characters."),
    brand: z.string().trim().max(60).nullable().optional(),
    grams: z.number().gt(0, "Enter how many grams.").max(5000, "Use at most 5000 g.").nullable().optional(),
    per100: macros.nullable().optional(),
    totals: macros.nullable().optional(),
    source: z.enum(["off", "usda", "manual"]),
    sourceId: z.string().max(40).nullable().optional(),
  })
  .refine((v) => (v.per100 && v.grams) || v.totals, { message: "Enter the calories and macros, or pick a food and its weight." });

export type NutritionResult = { ok: true } | { ok: false; error: string };

export async function addFood(raw: unknown): Promise<NutritionResult> {
  const user = await requireUser();
  const parsed = foodInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "That food isn't valid." };
  const v = parsed.data;
  if (v.date > user.today) return { ok: false, error: "You can't log food for a future day." };
  // Totals are recalculated here from per-100 g values when we have them, rather than trusted as sent.
  const totals = v.per100 && v.grams ? portion(v.per100, v.grams) : v.totals!;
  await db.foodEntry.create({
    data: {
      userId: user.id,
      date: toDbDate(v.date),
      meal: v.meal,
      name: v.name,
      brand: v.brand || null,
      grams: v.grams ?? null,
      ...totals,
      per100Calories: v.per100?.calories ?? null,
      per100Protein: v.per100?.protein ?? null,
      per100Carbs: v.per100?.carbs ?? null,
      per100Fat: v.per100?.fat ?? null,
      source: v.source,
      sourceId: v.sourceId ?? null,
    },
  });
  revalidatePath("/nutrition");
  return { ok: true };
}

export async function deleteFood(id: string): Promise<NutritionResult> {
  const user = await requireUser();
  const { count } = await db.foodEntry.deleteMany({ where: { id: String(id), userId: user.id } });
  if (count === 0) return { ok: false, error: "That food no longer exists." };
  revalidatePath("/nutrition");
  return { ok: true };
}

const profileInput = z.object({
  sex: z.enum(["male", "female"]),
  birthYear: z.number().int().min(1900, "Check your birth year.").max(new Date().getUTCFullYear() - 13, "You need to be at least 13."),
  heightCm: z.number().min(100, "Use centimetres, like 175.").max(250, "Use centimetres, like 175."),
  weightKg: z.number().min(25, "Use kilograms, like 70.").max(350, "Use kilograms, like 70."),
  activity: z.enum(["sedentary", "light", "moderate", "active", "very"]),
  goal: z.enum(["lose", "keep", "gain"]),
  // Optional: the user's own numbers instead of the suggestion.
  calorieTarget: z.number().int().min(800, "Use at least 800 kcal.").max(8000).nullable().optional(),
  proteinTarget: z.number().int().min(0).max(600).nullable().optional(),
});

export async function saveNutritionProfile(raw: unknown): Promise<NutritionResult> {
  const user = await requireUser();
  const parsed = profileInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the details." };
  const v = parsed.data;
  const year = Number(user.today.slice(0, 4));
  // The suggestion is always worked out on the server, so the under-18 and minimum-calorie rules can't be skipped.
  const s = suggestTargets(v, year);
  const goal = ageIn(v.birthYear, year) < 18 && v.goal === "lose" ? "keep" : v.goal;
  const calorieTarget = v.calorieTarget ?? s.calories;
  const proteinTarget = v.proteinTarget ?? s.protein;
  const fatTarget = Math.round((calorieTarget * 0.25) / 9);
  const carbsTarget = Math.max(0, Math.round((calorieTarget - proteinTarget * 4 - fatTarget * 9) / 4));
  const data = { sex: v.sex, birthYear: v.birthYear, heightCm: v.heightCm, weightKg: v.weightKg, activity: v.activity, goal, calorieTarget, proteinTarget, carbsTarget, fatTarget };
  await db.nutritionProfile.upsert({ where: { userId: user.id }, update: data, create: { userId: user.id, ...data } });
  revalidatePath("/nutrition", "layout");
  return { ok: true };
}
