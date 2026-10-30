"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { isISODate, toDbDate } from "@/lib/domain/dates";
import { isLoggableOn, isPeriodic, occurrencesOn, subHabitsOn, versionOn } from "@/lib/domain/schedule";
import { loadHabit } from "@/lib/data/habits";
import { requireUser } from "@/lib/session";

export type LogResult = { ok: true } | { ok: false; error: string };

const entry = z.object({
  date: z.string().refine(isISODate),
  occurrence: z.number().int().min(0).max(9),
  value: z.number().min(0).max(100000),
});

async function checkDay(userId: string, today: string, habitId: string, date: string, occurrence: number) {
  if (date > today) return { error: "You can't record progress for a future day." } as const;
  const habit = await loadHabit(userId, habitId);
  if (!habit) return { error: "That habit no longer exists." } as const;
  if (!isLoggableOn(habit, date)) return { error: "This habit isn't scheduled on that day." } as const;
  const v = versionOn(habit, date)!;
  const max = isPeriodic(v.frequency) ? 1 : occurrencesOn(habit, date);
  if (occurrence >= max) return { error: "That occurrence doesn't exist." } as const;
  return { habit } as const;
}

/**
 * Sets the recorded value for one occurrence. Idempotent: the (habit, date, occurrence) key is
 * unique, so repeating the request leaves one row. A value of 0 removes the entry (undo).
 */
export async function setHabitValue(habitId: string, raw: unknown): Promise<LogResult> {
  const user = await requireUser();
  const parsed = entry.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "That value isn't valid." };
  const { date, occurrence, value } = parsed.data;
  const check = await checkDay(user.id, user.today, habitId, date, occurrence);
  if ("error" in check) return { ok: false, error: check.error as string };

  const key = { habitId_date_occurrence: { habitId, date: toDbDate(date), occurrence } };
  if (value === 0) {
    await db.habitLog.deleteMany({ where: { habitId, userId: user.id, date: toDbDate(date), occurrence } });
  } else {
    await db.habitLog.upsert({
      where: key,
      update: { value },
      create: { userId: user.id, habitId, date: toDbDate(date), occurrence, value },
    });
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setSubHabitValue(habitId: string, subHabitId: string, raw: unknown): Promise<LogResult> {
  const user = await requireUser();
  const parsed = entry.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "That value isn't valid." };
  const { date, occurrence, value } = parsed.data;
  const check = await checkDay(user.id, user.today, habitId, date, occurrence);
  if ("error" in check) return { ok: false, error: check.error as string };
  if (!subHabitsOn(check.habit, date).some((s) => s.id === subHabitId)) {
    return { ok: false, error: "That step isn't part of this habit on that day." };
  }

  if (value === 0) {
    await db.subHabitLog.deleteMany({ where: { subHabitId, userId: user.id, date: toDbDate(date), occurrence } });
  } else {
    await db.subHabitLog.upsert({
      where: { subHabitId_date_occurrence: { subHabitId, date: toDbDate(date), occurrence } },
      update: { value },
      create: { userId: user.id, habitId, subHabitId, date: toDbDate(date), occurrence, value },
    });
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setHideCompleted(hide: boolean) {
  const user = await requireUser();
  await db.userPreference.update({ where: { userId: user.id }, data: { hideCompleted: hide } });
  revalidatePath("/today");
}
