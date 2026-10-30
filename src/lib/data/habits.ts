import "server-only";
import { db } from "@/lib/db";
import { fromDbDate, toDbDate, type ISODate } from "@/lib/domain/dates";
import { makeLogStore, type LogRow, type SubLogRow } from "@/lib/domain/progress";
import type { HabitDef } from "@/lib/domain/schedule";

// Every query here takes the signed-in user's id and filters on it. Callers get the id from
// requireUser(), never from request input.

export interface HabitView extends HabitDef {
  description: string | null;
  categoryName: string | null;
  icon: string | null;
  color: string | null;
  reminderEnabled: boolean;
  reminderTime: string | null;
  sortOrder: number;
}

const include = {
  schedules: { orderBy: { effectiveFrom: "asc" } },
  subHabits: { orderBy: { sortOrder: "asc" } },
  category: { select: { name: true } },
} as const;

type HabitRow = Awaited<ReturnType<typeof db.habit.findMany<{ include: typeof include }>>>[number];

function toView(h: HabitRow): HabitView {
  return {
    id: h.id,
    name: h.name,
    description: h.description,
    categoryId: h.categoryId,
    categoryName: h.category?.name ?? null,
    icon: h.icon,
    color: h.color,
    startDate: fromDbDate(h.startDate),
    endDate: h.endDate ? fromDbDate(h.endDate) : null,
    archivedOn: h.archivedOn ? fromDbDate(h.archivedOn) : null,
    reminderEnabled: h.reminderEnabled,
    reminderTime: h.reminderTime,
    sortOrder: h.sortOrder,
    schedules: h.schedules.map((s) => ({
      effectiveFrom: fromDbDate(s.effectiveFrom),
      frequency: s.frequency,
      weekdays: s.weekdays,
      intervalDays: s.intervalDays,
      timesPerDay: s.timesPerDay,
      targetType: s.targetType,
      targetValue: s.targetValue,
      targetUnit: s.targetUnit,
      paused: s.paused,
      requireSubHabits: s.requireSubHabits,
    })),
    subHabits: h.subHabits.map((s) => ({
      id: s.id,
      name: s.name,
      targetType: s.targetType,
      targetValue: s.targetValue,
      targetUnit: s.targetUnit,
      required: s.required,
      sortOrder: s.sortOrder,
      activeFrom: fromDbDate(s.activeFrom),
      archivedOn: s.archivedOn ? fromDbDate(s.archivedOn) : null,
    })),
  };
}

/** All habits, archived included: history and analytics need them. */
export async function loadHabits(userId: string): Promise<HabitView[]> {
  const rows = await db.habit.findMany({
    where: { userId },
    include,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toView);
}

export async function loadHabit(userId: string, habitId: string): Promise<HabitView | null> {
  const row = await db.habit.findFirst({ where: { id: habitId, userId }, include });
  return row ? toView(row) : null;
}

export async function loadLogs(userId: string, from: ISODate, to: ISODate, habitIds?: string[]) {
  const where = {
    userId,
    date: { gte: toDbDate(from), lte: toDbDate(to) },
    ...(habitIds ? { habitId: { in: habitIds } } : {}),
  };
  const [logs, subLogs] = await Promise.all([
    db.habitLog.findMany({ where, select: { habitId: true, date: true, occurrence: true, value: true } }),
    db.subHabitLog.findMany({
      where,
      select: { habitId: true, subHabitId: true, date: true, occurrence: true, value: true },
    }),
  ]);
  const logRows: LogRow[] = logs.map((l) => ({ ...l, date: fromDbDate(l.date) }));
  const subRows: SubLogRow[] = subLogs.map((l) => ({ ...l, date: fromDbDate(l.date) }));
  return { logRows, subRows, store: makeLogStore(logRows, subRows) };
}

export async function loadCategories(userId: string) {
  return db.category.findMany({ where: { userId }, orderBy: { name: "asc" }, select: { id: true, name: true } });
}
