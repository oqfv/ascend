// Which habits are scheduled on which days, under the schedule version in force that day.
// See docs/METRICS.md for the rules in prose.

import { addDays, diffDays, endOfMonth, endOfWeek, startOfMonth, startOfWeek, weekday, type ISODate } from "./dates";

export type Frequency = "DAILY" | "WEEKDAYS" | "INTERVAL" | "WEEKLY" | "MONTHLY";
export type TargetType = "CHECKBOX" | "DURATION" | "COUNT" | "QUANTITY";

export interface ScheduleVersion {
  effectiveFrom: ISODate;
  frequency: Frequency;
  weekdays: number[];
  intervalDays: number | null;
  timesPerDay: number;
  targetType: TargetType;
  targetValue: number;
  targetUnit: string | null;
  paused: boolean;
  /** When on and required sub-habits are active, they decide completion. */
  requireSubHabits: boolean;
}

export interface SubHabitDef {
  id: string;
  name: string;
  targetType: TargetType;
  targetValue: number;
  targetUnit: string | null;
  required: boolean;
  sortOrder: number;
  activeFrom: ISODate;
  archivedOn: ISODate | null;
}

export interface HabitDef {
  id: string;
  name: string;
  categoryId: string | null;
  startDate: ISODate;
  endDate: ISODate | null;
  archivedOn: ISODate | null;
  /** Sorted by effectiveFrom ascending. */
  schedules: ScheduleVersion[];
  subHabits: SubHabitDef[];
}

export function isPeriodic(f: Frequency): f is "WEEKLY" | "MONTHLY" {
  return f === "WEEKLY" || f === "MONTHLY";
}

/** The schedule version in force on a day, or null before the first version. */
export function versionOn(habit: HabitDef, date: ISODate): ScheduleVersion | null {
  let found: ScheduleVersion | null = null;
  for (const v of habit.schedules) {
    if (v.effectiveFrom <= date) found = v;
    else break;
  }
  return found;
}

/** Inside the habit's life and not paused or archived on this day. */
export function isActiveOn(habit: HabitDef, date: ISODate): boolean {
  if (date < habit.startDate) return false;
  if (habit.endDate && date > habit.endDate) return false;
  if (habit.archivedOn && date >= habit.archivedOn) return false;
  const v = versionOn(habit, date);
  return v !== null && !v.paused;
}

/**
 * Number of day-occurrences a day-based habit has on this date.
 * Periodic (weekly/monthly) habits have none: their target belongs to the period.
 */
export function occurrencesOn(habit: HabitDef, date: ISODate): number {
  if (!isActiveOn(habit, date)) return 0;
  const v = versionOn(habit, date)!;
  switch (v.frequency) {
    case "DAILY":
      return v.timesPerDay;
    case "WEEKDAYS":
      return v.weekdays.includes(weekday(date)) ? v.timesPerDay : 0;
    case "INTERVAL": {
      const every = Math.max(1, v.intervalDays ?? 1);
      return diffDays(v.effectiveFrom, date) % every === 0 ? v.timesPerDay : 0;
    }
    default:
      return 0;
  }
}

/** Whether the habit can be logged on this day (scheduled, or any active day of a periodic habit). */
export function isLoggableOn(habit: HabitDef, date: ISODate): boolean {
  if (!isActiveOn(habit, date)) return false;
  const v = versionOn(habit, date)!;
  return isPeriodic(v.frequency) || occurrencesOn(habit, date) > 0;
}

export function subHabitsOn(habit: HabitDef, date: ISODate): SubHabitDef[] {
  return habit.subHabits
    .filter((s) => s.activeFrom <= date && (!s.archivedOn || date < s.archivedOn))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export interface Period {
  start: ISODate;
  end: ISODate;
}

export function periodContaining(
  frequency: "WEEKLY" | "MONTHLY",
  date: ISODate,
  weekStartsOn: number,
): Period {
  return frequency === "WEEKLY"
    ? { start: startOfWeek(date, weekStartsOn), end: endOfWeek(date, weekStartsOn) }
    : { start: startOfMonth(date), end: endOfMonth(date) };
}

export function nextPeriod(frequency: "WEEKLY" | "MONTHLY", p: Period, weekStartsOn: number): Period {
  return periodContaining(frequency, addDays(p.end, 1), weekStartsOn);
}

/** A checkbox target is one per occurrence for day-based habits. */
export function occurrenceTarget(v: ScheduleVersion): number {
  return v.targetType === "CHECKBOX" ? 1 : v.targetValue;
}
