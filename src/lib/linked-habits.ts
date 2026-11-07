import "server-only";
import { db } from "@/lib/db";
import { fromDbDate, toDbDate, type ISODate } from "@/lib/domain/dates";
import { onTarget, sumMacros, waterTarget } from "@/lib/domain/nutrition";
import { isLoggableOn } from "@/lib/domain/schedule";
import { loadLinkedHabits } from "@/lib/data/habits";

// Habits linked to Nutrition fill themselves in. Their value for a day is worked out from the
// food, water and targets the user logged, and written as an ordinary habit log, so Today,
// streaks and Analytics treat them like any other habit.

export const LINKS = {
  WATER: { name: "Drink water", icon: "droplet", color: "sky", targetType: "QUANTITY", unit: "ml" },
  PROTEIN: { name: "Hit my protein", icon: "apple", color: "moss", targetType: "QUANTITY", unit: "g" },
  ON_TARGET: { name: "Eat on target", icon: "leaf", color: "ochre", targetType: "CHECKBOX", unit: null },
} as const;
export type LinkKey = keyof typeof LINKS;
export const LINK_KEYS = Object.keys(LINKS) as LinkKey[];
export const isLinkKey = (v: unknown): v is LinkKey => typeof v === "string" && v in LINKS;

/** Each link's daily target from the user's current Nutrition settings; null when it can't be set yet. */
export async function linkTargets(userId: string): Promise<Record<LinkKey, number | null>> {
  const [profile, weight] = await Promise.all([
    db.nutritionProfile.findUnique({ where: { userId } }),
    db.bodyWeight.findFirst({ where: { userId }, orderBy: { date: "desc" }, select: { kg: true } }),
  ]);
  return {
    WATER: waterTarget(profile?.waterTargetMl, profile?.weightKg ?? weight?.kg),
    PROTEIN: profile ? profile.proteinTarget : null,
    ON_TARGET: profile ? 1 : null,
  };
}

/** Writes the day's value for every linked habit. Call after anything that changes food or water. */
export async function syncLinkedDay(userId: string, date: ISODate): Promise<void> {
  const habits = (await loadLinkedHabits(userId)).filter((h) => isLinkKey(h.link) && isLoggableOn(h, date));
  if (habits.length === 0) return;
  const [entries, water, profile] = await Promise.all([
    db.foodEntry.findMany({ where: { userId, date: toDbDate(date) }, select: { calories: true, protein: true, carbs: true, fat: true } }),
    db.waterLog.findUnique({ where: { userId_date: { userId, date: toDbDate(date) } }, select: { ml: true } }),
    db.nutritionProfile.findUnique({ where: { userId }, select: { calorieTarget: true, proteinTarget: true } }),
  ]);
  const eaten = sumMacros(entries);
  const valueOf: Record<LinkKey, number> = {
    WATER: water?.ml ?? 0,
    PROTEIN: Math.round(eaten.protein),
    ON_TARGET: profile && onTarget(eaten, { calories: profile.calorieTarget, protein: profile.proteinTarget }) ? 1 : 0,
  };
  for (const h of habits) {
    const value = valueOf[h.link as LinkKey];
    const where = { habitId: h.id, userId, date: toDbDate(date), occurrence: 0 };
    if (value <= 0) await db.habitLog.deleteMany({ where });
    else
      await db.habitLog.upsert({
        where: { habitId_date_occurrence: { habitId: h.id, date: toDbDate(date), occurrence: 0 } },
        update: { value },
        create: { ...where, value },
      });
  }
}

/**
 * Keeps linked habits' targets in step with Nutrition. A changed target is written as a new
 * schedule version from today, so earlier days keep the target they were tracked under.
 */
export async function syncLinkedTargets(userId: string, today: ISODate): Promise<void> {
  const habits = await db.habit.findMany({
    where: { userId, link: { not: null }, archivedOn: null },
    include: { schedules: { orderBy: { effectiveFrom: "asc" } } },
  });
  if (habits.length === 0) return;
  const targets = await linkTargets(userId);
  for (const h of habits) {
    const want = isLinkKey(h.link) ? targets[h.link] : null;
    const current = [...h.schedules].reverse().find((s) => fromDbDate(s.effectiveFrom) <= today) ?? h.schedules[0];
    if (want === null || !current || current.targetValue === want) continue;
    const { frequency, weekdays, intervalDays, timesPerDay, targetType, targetUnit, paused, requireSubHabits } = current;
    const fields = { frequency, weekdays, intervalDays, timesPerDay, targetType, targetUnit, paused, requireSubHabits, targetValue: want };
    const from = fromDbDate(h.startDate) > today ? h.startDate : toDbDate(today);
    await db.habitSchedule.upsert({
      where: { habitId_effectiveFrom: { habitId: h.id, effectiveFrom: from } },
      update: { targetValue: want },
      create: { habitId: h.id, effectiveFrom: from, ...fields },
    });
  }
}
