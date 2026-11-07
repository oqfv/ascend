import "server-only";
import type { Macros } from "@/lib/domain/nutrition";

// "2 eggs and a slice of toast" → items with nutrition, from CalorieNinjas. Only the meal text is sent.
// Without a quantity CalorieNinjas often assumes 100 g, so every item's grams are shown for the user to check.

export type MealItem = { name: string; grams: number; per100: Macros };

const r1 = (v: number) => Math.round(v * 10) / 10;

export async function describeMeal(text: string): Promise<MealItem[]> {
  const key = process.env.CALORIENINJAS_API_KEY?.trim();
  if (!key) throw new Error("not-configured");
  const url = new URL("https://api.calorieninjas.com/v1/nutrition");
  url.searchParams.set("query", text);
  const res = await fetch(url, { headers: { "X-Api-Key": key }, signal: AbortSignal.timeout(8000), cache: "no-store" });
  if (!res.ok) throw new Error(`CalorieNinjas ${res.status}`);
  const data = (await res.json()) as { items?: { name: string; serving_size_g: number; calories: number; protein_g: number; carbohydrates_total_g: number; fat_total_g: number }[] };
  return (data.items ?? []).flatMap((i) => {
    const g = Number(i.serving_size_g);
    // A paid-only placeholder or a missing size can't be turned into numbers; skip it rather than guess.
    if (!(g > 0) || typeof i.calories !== "number") return [];
    const k = 100 / g;
    return [{
      name: i.name.slice(0, 1).toUpperCase() + i.name.slice(1, 120),
      grams: Math.round(g),
      per100: { calories: Math.round(i.calories * k), protein: r1(i.protein_g * k), carbs: r1(i.carbohydrates_total_g * k), fat: r1(i.fat_total_g * k) },
    }];
  });
}
