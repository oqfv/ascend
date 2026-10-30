"use server";

import { revalidatePath } from "next/cache";
import type { HabitSchedule, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { fromDbDate, maxDate, toDbDate, type ISODate } from "@/lib/domain/dates";
import { requireUser } from "@/lib/session";
import { habitInput, normalizeHabit, type HabitInput } from "@/lib/validation/habit";

export type ActionResult = { ok: true; id?: string } | { ok: false; error?: string; fieldErrors?: Record<string, string> };

function invalid(error: { issues: { path: PropertyKey[]; message: string }[] }): ActionResult {
  const fieldErrors: Record<string, string> = {};
  for (const i of error.issues) fieldErrors[i.path.map(String).join(".")] ??= i.message;
  return { ok: false, fieldErrors, error: "Check the highlighted fields." };
}

function refresh() {
  revalidatePath("/", "layout");
}

async function resolveCategory(tx: Prisma.TransactionClient, userId: string, v: HabitInput): Promise<string | null> {
  if (v.newCategory) {
    const c = await tx.category.upsert({
      where: { userId_name: { userId, name: v.newCategory } },
      update: {},
      create: { userId, name: v.newCategory },
    });
    return c.id;
  }
  if (!v.categoryId) return null;
  const owned = await tx.category.findFirst({ where: { id: v.categoryId, userId }, select: { id: true } });
  return owned?.id ?? null;
}

const scheduleOf = (v: HabitInput) => ({
  frequency: v.frequency,
  weekdays: v.weekdays,
  intervalDays: v.intervalDays,
  timesPerDay: v.timesPerDay,
  targetType: v.targetType,
  targetValue: v.targetValue,
  targetUnit: v.targetUnit,
  requireSubHabits: v.requireSubHabits,
});

type ScheduleFields = ReturnType<typeof scheduleOf>;

/** The rule fields of an existing version, for writing a copy of it from another day. */
const copyOf = (s: HabitSchedule) => ({
  frequency: s.frequency,
  weekdays: s.weekdays,
  intervalDays: s.intervalDays,
  timesPerDay: s.timesPerDay,
  targetType: s.targetType,
  targetValue: s.targetValue,
  targetUnit: s.targetUnit,
  requireSubHabits: s.requireSubHabits,
});

function sameSchedule(a: ScheduleFields, b: ScheduleFields): boolean {
  return (
    a.frequency === b.frequency &&
    a.weekdays.join(",") === b.weekdays.join(",") &&
    a.intervalDays === b.intervalDays &&
    a.timesPerDay === b.timesPerDay &&
    a.targetType === b.targetType &&
    a.targetValue === b.targetValue &&
    (a.targetUnit ?? null) === (b.targetUnit ?? null) &&
    a.requireSubHabits === b.requireSubHabits
  );
}

export async function createHabit(raw: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = habitInput.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error);
  const v = normalizeHabit(parsed.data);

  const id = await db.$transaction(async (tx) => {
    const categoryId = await resolveCategory(tx, user.id, v);
    const last = await tx.habit.aggregate({ where: { userId: user.id }, _max: { sortOrder: true } });
    const habit = await tx.habit.create({
      data: {
        userId: user.id,
        name: v.name,
        description: v.description,
        categoryId,
        icon: v.icon,
        color: v.color,
        startDate: toDbDate(v.startDate),
        endDate: v.endDate ? toDbDate(v.endDate) : null,
        reminderEnabled: v.reminderEnabled,
        reminderTime: v.reminderTime,
        sortOrder: (last._max.sortOrder ?? -1) + 1,
        schedules: { create: { effectiveFrom: toDbDate(v.startDate), ...scheduleOf(v) } },
        subHabits: {
          create: v.subHabits.map((s, i) => ({
            name: s.name,
            targetType: s.targetType,
            targetValue: s.targetValue,
            targetUnit: s.targetUnit,
            required: s.required,
            sortOrder: i,
            activeFrom: toDbDate(v.startDate),
          })),
        },
      },
    });
    return habit.id;
  });
  refresh();
  return { ok: true, id };
}

/**
 * Edits a habit without rewriting its history:
 * - name, description, category, icon, colour and reminders change in place;
 * - a schedule or target change becomes a new version from today (or replaces the first
 *   version if the habit has not started yet);
 * - a sub-habit whose target or required flag changes is retired today and replaced, and
 *   today's entries move to the replacement; removed sub-habits with history are retired.
 */
export async function updateHabit(habitId: string, raw: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = habitInput.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error);
  const v = normalizeHabit(parsed.data);

  const habit = await db.habit.findFirst({
    where: { id: habitId, userId: user.id },
    include: { schedules: { orderBy: { effectiveFrom: "asc" } }, subHabits: true },
  });
  if (!habit) return { ok: false, error: "That habit no longer exists." };

  const today = user.today;
  const oldStart = fromDbDate(habit.startDate);
  const started = oldStart <= today;

  if (v.startDate !== oldStart && started) {
    const earlier = await db.habitLog.count({ where: { habitId, date: { lt: toDbDate(v.startDate) } } });
    if (v.startDate > oldStart && earlier > 0) {
      return { ok: false, fieldErrors: { startDate: "There are entries before this date. Keep the earlier start." } };
    }
  }

  // Before the habit starts, nothing has history: edits replace its first version outright.
  const effective: ISODate = started ? maxDate(today, v.startDate) : v.startDate;

  await db.$transaction(async (tx) => {
    const categoryId = await resolveCategory(tx, user.id, v);
    await tx.habit.update({
      where: { id: habitId },
      data: {
        name: v.name,
        description: v.description,
        categoryId,
        icon: v.icon,
        color: v.color,
        startDate: toDbDate(v.startDate),
        endDate: v.endDate ? toDbDate(v.endDate) : null,
        reminderEnabled: v.reminderEnabled,
        reminderTime: v.reminderTime,
      },
    });

    // Schedule versions.
    const next = scheduleOf(v);
    if (!started) {
      await tx.habitSchedule.deleteMany({ where: { habitId } });
      await tx.habitSchedule.create({ data: { habitId, effectiveFrom: toDbDate(v.startDate), ...next } });
    } else {
      if (v.startDate < oldStart && habit.schedules[0]) {
        await tx.habitSchedule.update({ where: { id: habit.schedules[0].id }, data: { effectiveFrom: toDbDate(v.startDate) } });
      }
      const current = [...habit.schedules].reverse().find((s) => fromDbDate(s.effectiveFrom) <= effective);
      if (!current || !sameSchedule(current, next)) {
        await tx.habitSchedule.upsert({
          where: { habitId_effectiveFrom: { habitId, effectiveFrom: toDbDate(effective) } },
          update: { ...next, paused: current?.paused ?? false },
          create: { habitId, effectiveFrom: toDbDate(effective), ...next, paused: current?.paused ?? false },
        });
      }
    }

    // Sub-habits.
    const live = habit.subHabits.filter((s) => !s.archivedOn || fromDbDate(s.archivedOn) > today);
    const keep = new Set(v.subHabits.map((s) => s.id).filter(Boolean));
    for (const old of live) {
      if (keep.has(old.id)) continue;
      const history = started && (await tx.subHabitLog.count({ where: { subHabitId: old.id, date: { lt: toDbDate(today) } } })) > 0;
      if (history) await tx.subHabit.update({ where: { id: old.id }, data: { archivedOn: toDbDate(today) } });
      else await tx.subHabit.delete({ where: { id: old.id } });
    }
    for (const [i, s] of v.subHabits.entries()) {
      const old = s.id ? live.find((o) => o.id === s.id) : undefined;
      if (!old) {
        await tx.subHabit.create({
          data: {
            habitId,
            name: s.name,
            targetType: s.targetType,
            targetValue: s.targetValue,
            targetUnit: s.targetUnit,
            required: s.required,
            sortOrder: i,
            activeFrom: toDbDate(effective),
          },
        });
        continue;
      }
      const ruleChanged =
        old.targetType !== s.targetType ||
        old.targetValue !== s.targetValue ||
        (old.targetUnit ?? null) !== (s.targetUnit ?? null) ||
        old.required !== s.required;
      const history =
        started && ruleChanged && (await tx.subHabitLog.count({ where: { subHabitId: old.id, date: { lt: toDbDate(today) } } })) > 0;
      if (!history) {
        await tx.subHabit.update({
          where: { id: old.id },
          data: {
            name: s.name,
            targetType: s.targetType,
            targetValue: s.targetValue,
            targetUnit: s.targetUnit,
            required: s.required,
            sortOrder: i,
          },
        });
        continue;
      }
      await tx.subHabit.update({ where: { id: old.id }, data: { archivedOn: toDbDate(today) } });
      const replacement = await tx.subHabit.create({
        data: {
          habitId,
          name: s.name,
          targetType: s.targetType,
          targetValue: s.targetValue,
          targetUnit: s.targetUnit,
          required: s.required,
          sortOrder: i,
          activeFrom: toDbDate(today),
        },
      });
      await tx.subHabitLog.updateMany({
        where: { subHabitId: old.id, date: { gte: toDbDate(today) } },
        data: { subHabitId: replacement.id },
      });
    }
  });
  refresh();
  return { ok: true, id: habitId };
}

async function ownedHabit(userId: string, habitId: string) {
  return db.habit.findFirst({
    where: { id: habitId, userId },
    include: { schedules: { orderBy: { effectiveFrom: "asc" } } },
  });
}

/** Writes a version from today that copies the current one with a new paused flag. */
async function setPaused(habitId: string, paused: boolean): Promise<ActionResult> {
  const user = await requireUser();
  const habit = await ownedHabit(user.id, habitId);
  if (!habit) return { ok: false, error: "That habit no longer exists." };
  const today = maxDate(user.today, fromDbDate(habit.startDate));
  const current = [...habit.schedules].reverse().find((s) => fromDbDate(s.effectiveFrom) <= today) ?? habit.schedules[0];
  if (!current) return { ok: false, error: "This habit has no schedule." };
  if (current.paused === paused) return { ok: true };
  const fields = copyOf(current);
  await db.habitSchedule.upsert({
    where: { habitId_effectiveFrom: { habitId, effectiveFrom: toDbDate(today) } },
    update: { paused },
    create: { ...fields, habitId, effectiveFrom: toDbDate(today), paused },
  });
  refresh();
  return { ok: true };
}

export async function pauseHabit(habitId: string) {
  return setPaused(habitId, true);
}

export async function resumeHabit(habitId: string) {
  return setPaused(habitId, false);
}

export async function archiveHabit(habitId: string): Promise<ActionResult> {
  const user = await requireUser();
  const habit = await ownedHabit(user.id, habitId);
  if (!habit) return { ok: false, error: "That habit no longer exists." };
  if (!habit.archivedOn) {
    await db.habit.update({ where: { id: habitId }, data: { archivedOn: toDbDate(user.today) } });
  }
  refresh();
  return { ok: true };
}

/**
 * Restoring keeps the archived stretch out of the record: it becomes a paused version from the
 * archive day to yesterday, and the habit resumes today with its last schedule.
 */
export async function restoreHabit(habitId: string): Promise<ActionResult> {
  const user = await requireUser();
  const habit = await ownedHabit(user.id, habitId);
  if (!habit) return { ok: false, error: "That habit no longer exists." };
  if (!habit.archivedOn) return { ok: true };
  const archivedOn = fromDbDate(habit.archivedOn);
  const today = user.today;
  const last = [...habit.schedules].reverse().find((s) => fromDbDate(s.effectiveFrom) <= archivedOn) ?? habit.schedules[0];

  await db.$transaction(async (tx) => {
    if (last && archivedOn < today) {
      const fields = copyOf(last);
      await tx.habitSchedule.upsert({
        where: { habitId_effectiveFrom: { habitId, effectiveFrom: toDbDate(archivedOn) } },
        update: { paused: true },
        create: { ...fields, habitId, effectiveFrom: toDbDate(archivedOn), paused: true },
      });
      await tx.habitSchedule.upsert({
        where: { habitId_effectiveFrom: { habitId, effectiveFrom: toDbDate(today) } },
        update: { paused: false },
        create: { ...fields, habitId, effectiveFrom: toDbDate(today), paused: false },
      });
    }
    await tx.habit.update({ where: { id: habitId }, data: { archivedOn: null } });
  });
  refresh();
  return { ok: true };
}

/** Permanent. The UI confirms by naming the habit and the number of entries that go with it. */
export async function deleteHabit(habitId: string): Promise<ActionResult> {
  const user = await requireUser();
  const { count } = await db.habit.deleteMany({ where: { id: habitId, userId: user.id } });
  if (count === 0) return { ok: false, error: "That habit no longer exists." };
  refresh();
  return { ok: true };
}

export async function moveHabit(habitId: string, direction: "up" | "down"): Promise<ActionResult> {
  const user = await requireUser();
  const habits = await db.habit.findMany({
    where: { userId: user.id, archivedOn: null },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  const i = habits.findIndex((h) => h.id === habitId);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= habits.length) return { ok: true };
  [habits[i], habits[j]] = [habits[j], habits[i]];
  await db.$transaction(habits.map((h, n) => db.habit.update({ where: { id: h.id }, data: { sortOrder: n } })));
  refresh();
  return { ok: true };
}

export async function countEntries(habitId: string): Promise<number> {
  const user = await requireUser();
  return db.habitLog.count({ where: { habitId, userId: user.id } });
}
