"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { toDbDate } from "@/lib/domain/dates";
import { requireUser } from "@/lib/session";
import { habitInput, normalizeHabit } from "@/lib/validation/habit";

export type ImportResult = { ok: true; created: number; skipped: number } | { ok: false; error: string };

const payload = z.object({
  rows: z.array(habitInput).min(1).max(200),
  duplicates: z.enum(["skip", "keep-both"]),
});

/**
 * Creates habits from validated import rows. Never updates or replaces an existing habit:
 * a row whose name matches one already on the account is skipped or added alongside it.
 */
export async function importHabits(raw: unknown): Promise<ImportResult> {
  const user = await requireUser();
  const parsed = payload.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Some rows are no longer valid. Upload the file again." };
  const { rows, duplicates } = parsed.data;

  const existing = new Set(
    (await db.habit.findMany({ where: { userId: user.id }, select: { name: true } })).map((h) => h.name.toLowerCase()),
  );
  const seen = new Set<string>();
  const toCreate = rows.map(normalizeHabit).filter((r) => {
    const key = r.name.toLowerCase();
    const dup = existing.has(key) || seen.has(key);
    seen.add(key);
    return duplicates === "keep-both" || !dup;
  });

  await db.$transaction(async (tx) => {
    const names = [...new Set(toCreate.map((r) => r.newCategory).filter((c): c is string => Boolean(c)))];
    const categories = new Map<string, string>();
    for (const name of names) {
      const c = await tx.category.upsert({
        where: { userId_name: { userId: user.id, name } },
        update: {},
        create: { userId: user.id, name },
      });
      categories.set(name, c.id);
    }
    const last = await tx.habit.aggregate({ where: { userId: user.id }, _max: { sortOrder: true } });
    let order = (last._max.sortOrder ?? -1) + 1;
    for (const r of toCreate) {
      await tx.habit.create({
        data: {
          userId: user.id,
          name: r.name,
          description: r.description,
          categoryId: r.newCategory ? categories.get(r.newCategory) : null,
          startDate: toDbDate(r.startDate),
          endDate: r.endDate ? toDbDate(r.endDate) : null,
          sortOrder: order++,
          schedules: {
            create: {
              effectiveFrom: toDbDate(r.startDate),
              frequency: r.frequency,
              weekdays: r.weekdays,
              intervalDays: r.intervalDays,
              timesPerDay: r.timesPerDay,
              targetType: r.targetType,
              targetValue: r.targetValue,
              targetUnit: r.targetUnit,
              requireSubHabits: r.requireSubHabits,
            },
          },
        },
      });
    }
  });

  revalidatePath("/", "layout");
  return { ok: true, created: toCreate.length, skipped: rows.length - toCreate.length };
}
