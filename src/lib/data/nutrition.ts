import "server-only";
import { db } from "@/lib/db";
import { toDbDate, type ISODate } from "@/lib/domain/dates";
import type { Macros } from "@/lib/domain/nutrition";

export async function loadNutritionProfile(userId: string) {
  return db.nutritionProfile.findUnique({ where: { userId } });
}

export async function loadFoodDay(userId: string, date: ISODate) {
  return db.foodEntry.findMany({ where: { userId, date: toDbDate(date) }, orderBy: { createdAt: "asc" } });
}

export type RecentFood = { name: string; brand: string | null; source: string; sourceId: string | null; per100: Macros | null; totals: Macros; grams: number | null };

/** The user's most recent distinct foods, for one-tap re-adding. */
export async function loadRecentFoods(userId: string, limit = 12): Promise<RecentFood[]> {
  const rows = await db.foodEntry.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 120 });
  const seen = new Set<string>();
  const out: RecentFood[] = [];
  for (const r of rows) {
    const key = `${r.name.toLowerCase()}|${r.brand?.toLowerCase() ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      name: r.name,
      brand: r.brand,
      source: r.source,
      sourceId: r.sourceId,
      grams: r.grams,
      totals: { calories: r.calories, protein: r.protein, carbs: r.carbs, fat: r.fat },
      per100:
        r.per100Calories === null ? null : { calories: r.per100Calories, protein: r.per100Protein ?? 0, carbs: r.per100Carbs ?? 0, fat: r.per100Fat ?? 0 },
    });
    if (out.length >= limit) break;
  }
  return out;
}
