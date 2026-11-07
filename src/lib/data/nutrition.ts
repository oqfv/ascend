import "server-only";
import { db } from "@/lib/db";
import { eachDay, toDbDate, type ISODate } from "@/lib/domain/dates";
import { summarizeNutrition, waterTarget, type Macros } from "@/lib/domain/nutrition";

export async function loadNutritionProfile(userId: string) {
  return db.nutritionProfile.findUnique({ where: { userId } });
}

export async function loadFoodDay(userId: string, date: ISODate) {
  return db.foodEntry.findMany({ where: { userId, date: toDbDate(date) }, orderBy: { createdAt: "asc" } });
}

export async function loadWater(userId: string, date: ISODate) {
  return (await db.waterLog.findUnique({ where: { userId_date: { userId, date: toDbDate(date) } } }))?.ml ?? 0;
}

/** Recent weigh-ins, newest first. */
export async function loadWeights(userId: string, limit = 60) {
  const rows = await db.bodyWeight.findMany({ where: { userId }, orderBy: { date: "desc" }, take: limit });
  return rows.map((r) => ({ date: r.date.toISOString().slice(0, 10), kg: r.kg }));
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

/** Food, water and weight for a period (clipped to today), summarised against the current targets. */
export async function loadNutritionPeriod(userId: string, from: ISODate, to: ISODate, today: ISODate) {
  const end = to > today ? today : to;
  const range = { gte: toDbDate(from), lte: toDbDate(end) };
  const [profile, food, water, weights, latestWeight] = await Promise.all([
    db.nutritionProfile.findUnique({ where: { userId } }),
    db.foodEntry.groupBy({ by: ["date"], where: { userId, date: range }, _sum: { calories: true, protein: true } }),
    db.waterLog.findMany({ where: { userId, date: range }, select: { date: true, ml: true } }),
    db.bodyWeight.findMany({ where: { userId, date: range }, select: { date: true, kg: true }, orderBy: { date: "asc" } }),
    db.bodyWeight.findFirst({ where: { userId }, orderBy: { date: "desc" }, select: { kg: true } }),
  ]);
  const day = (d: Date) => d.toISOString().slice(0, 10);
  return summarizeNutrition({
    dates: from <= end ? eachDay(from, end) : [],
    food: new Map(food.map((f) => [day(f.date), { calories: f._sum.calories ?? 0, protein: f._sum.protein ?? 0 }])),
    water: new Map(water.map((w) => [day(w.date), w.ml])),
    weights: weights.map((w) => ({ date: day(w.date), kg: w.kg })),
    targets: profile ? { calories: profile.calorieTarget, protein: profile.proteinTarget } : null,
    waterTargetMl: waterTarget(profile?.waterTargetMl, profile?.weightKg ?? latestWeight?.kg),
  });
}
