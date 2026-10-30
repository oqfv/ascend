// How recorded values turn into progress, completion and status.
// Recorded values are never capped; progress ratios are capped at 1 (100%).

import { diffDays, eachDay, type ISODate } from "./dates";
import {
  isActiveOn,
  isPeriodic,
  occurrenceTarget,
  subHabitsOn,
  versionOn,
  type HabitDef,
  type Period,
  type ScheduleVersion,
  type SubHabitDef,
} from "./schedule";

export interface LogStore {
  habit(habitId: string, date: ISODate, occurrence: number): number | undefined;
  sub(subHabitId: string, date: ISODate, occurrence: number): number | undefined;
}

export interface LogRow {
  habitId: string;
  date: ISODate;
  occurrence: number;
  value: number;
}

export interface SubLogRow extends LogRow {
  subHabitId: string;
}

export function makeLogStore(logs: LogRow[], subLogs: SubLogRow[]): LogStore {
  const h = new Map<string, number>();
  const s = new Map<string, number>();
  for (const l of logs) h.set(`${l.habitId}|${l.date}|${l.occurrence}`, l.value);
  for (const l of subLogs) s.set(`${l.subHabitId}|${l.date}|${l.occurrence}`, l.value);
  return {
    habit: (id, d, o) => h.get(`${id}|${d}|${o}`),
    sub: (id, d, o) => s.get(`${id}|${d}|${o}`),
  };
}

export const ratio = (actual: number, target: number): number =>
  target <= 0 ? (actual > 0 ? 1 : 0) : Math.min(1, Math.max(0, actual / target));

export type OccurrenceStatus = "complete" | "partial" | "missed" | "pending" | "future";

export interface SubResult {
  sub: SubHabitDef;
  actual: number;
  target: number;
  progress: number;
  complete: boolean;
}

export interface OccurrenceResult {
  date: ISODate;
  occurrence: number;
  /** "subhabits": completion follows required sub-habits; "self": the habit's own value. */
  rule: "subhabits" | "self";
  actual: number;
  target: number;
  progress: number;
  complete: boolean;
  status: OccurrenceStatus;
  subs: SubResult[];
}

function subTarget(s: SubHabitDef): number {
  return s.targetType === "CHECKBOX" ? 1 : s.targetValue;
}

export function statusOf(date: ISODate, today: ISODate, progress: number, complete: boolean): OccurrenceStatus {
  if (date > today) return "future";
  if (complete) return "complete";
  if (progress > 0) return "partial";
  return date < today ? "missed" : "pending";
}

/**
 * Evaluates one occurrence of a habit on a day.
 * Rule: when the version's requireSubHabits is on and at least one required sub-habit is active that day,
 * the occurrence is complete only when every required sub-habit meets its target, and its
 * progress is the mean of the required sub-habits' capped progress. Otherwise the habit's own
 * recorded value against its own target decides. Optional sub-habits never affect completion.
 */
export function evaluateOccurrence(
  habit: HabitDef,
  v: ScheduleVersion,
  date: ISODate,
  occurrence: number,
  logs: LogStore,
  today: ISODate,
): OccurrenceResult {
  const subs = subHabitsOn(habit, date).map<SubResult>((sub) => {
    const actual = logs.sub(sub.id, date, occurrence) ?? 0;
    const target = subTarget(sub);
    return { sub, actual, target, progress: ratio(actual, target), complete: actual >= target };
  });
  const required = subs.filter((s) => s.sub.required);

  if (v.requireSubHabits && required.length > 0) {
    const progress = required.reduce((sum, s) => sum + s.progress, 0) / required.length;
    const complete = required.every((s) => s.complete);
    const done = required.filter((s) => s.complete).length;
    return {
      date,
      occurrence,
      rule: "subhabits",
      actual: done,
      target: required.length,
      progress,
      complete,
      status: statusOf(date, today, progress, complete),
      subs,
    };
  }

  const actual = logs.habit(habit.id, date, occurrence) ?? 0;
  // A periodic habit's day counts as one session when checked; its period target is elsewhere.
  const target = isPeriodic(v.frequency) ? (v.targetType === "CHECKBOX" ? 1 : 0) : occurrenceTarget(v);
  const complete = target > 0 ? actual >= target : actual > 0;
  const progress = target > 0 ? ratio(actual, target) : actual > 0 ? 1 : 0;
  return {
    date,
    occurrence,
    rule: "self",
    actual,
    target,
    progress,
    complete,
    status: statusOf(date, today, progress, complete),
    subs,
  };
}

export type PeriodStatus = "complete" | "missed" | "in-progress" | "upcoming";

export interface PeriodResult {
  period: Period;
  version: ScheduleVersion;
  /** Target after prorating for days the habit was not active in the period. */
  target: number;
  actual: number;
  remaining: number;
  progress: number;
  complete: boolean;
  status: PeriodStatus;
  activeDays: number;
}

/**
 * Evaluates a weekly or monthly target over one period.
 * The period is judged by the version in force on its last active day up to today.
 * If the habit was active on only part of the period, the target is prorated by active days
 * (rounded up for sessions and counts). Returns null when the habit was never active in it.
 */
export function evaluatePeriod(habit: HabitDef, period: Period, logs: LogStore, today: ISODate): PeriodResult | null {
  const days = eachDay(period.start, period.end);
  const active = days.filter((d) => isActiveOn(habit, d) && isPeriodic(versionOn(habit, d)!.frequency));
  if (active.length === 0) return null;

  const judgedOn = [...active].reverse().find((d) => d <= today) ?? active[0];
  const version = versionOn(habit, judgedOn)!;
  const fullTarget = version.targetValue;
  const share = active.length / days.length;
  const rounded = version.targetType === "CHECKBOX" || version.targetType === "COUNT";
  const target = share >= 1 ? fullTarget : rounded ? Math.ceil(fullTarget * share) : fullTarget * share;

  let actual = 0;
  for (const d of active) {
    if (d > today) break;
    if (version.targetType === "CHECKBOX") {
      if (evaluateOccurrence(habit, version, d, 0, logs, today).complete) actual += 1;
    } else {
      actual += logs.habit(habit.id, d, 0) ?? 0;
    }
  }

  const complete = actual >= target;
  const status: PeriodStatus = complete
    ? "complete"
    : today > period.end
      ? "missed"
      : today < period.start
        ? "upcoming"
        : "in-progress";

  return {
    period,
    version,
    target,
    actual,
    remaining: Math.max(0, target - actual),
    progress: ratio(actual, target),
    complete,
    status,
    activeDays: active.length,
  };
}

/** Days left in a period counting today, or 0 when it has ended. */
export function daysLeft(period: Period, today: ISODate): number {
  if (today > period.end) return 0;
  return diffDays(today < period.start ? period.start : today, period.end) + 1;
}
