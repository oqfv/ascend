// Aggregations behind the dashboard, reviews and analytics. Pure functions over HabitDef + logs;
// presentation components only format what these return. Definitions: docs/METRICS.md.

import { addDays, eachDay, maxDate, minDate, type ISODate } from "./dates";
import { evaluateOccurrence, evaluatePeriod, type LogStore, type OccurrenceResult, type PeriodResult } from "./progress";
import {
  isActiveOn,
  isPeriodic,
  nextPeriod,
  occurrencesOn,
  periodContaining,
  subHabitsOn,
  versionOn,
  type HabitDef,
  type Period,
} from "./schedule";

export interface Ctx {
  logs: LogStore;
  today: ISODate;
  weekStartsOn: number;
}

/** Completed / eligible as a percentage, or null when nothing was eligible. */
export function rate(completed: number, eligible: number): number | null {
  return eligible > 0 ? (completed / eligible) * 100 : null;
}

/** Difference in percentage points; null when either side has no data. */
export function pointChange(current: number | null, previous: number | null): number | null {
  return current === null || previous === null ? null : current - previous;
}

export function occurrencesForDay(habit: HabitDef, date: ISODate, ctx: Ctx): OccurrenceResult[] {
  const n = occurrencesOn(habit, date);
  if (n === 0) return [];
  const v = versionOn(habit, date)!;
  return Array.from({ length: n }, (_, i) => evaluateOccurrence(habit, v, date, i, ctx.logs, ctx.today));
}

export interface DaySummary {
  date: ISODate;
  /** Day-based occurrences scheduled on the day. */
  scheduled: number;
  /** Scheduled occurrences on or before today. */
  eligible: number;
  completed: number;
  partial: number;
  missed: number;
  pending: number;
  /** Sum of capped progress over eligible occurrences (partial credit). */
  progressSum: number;
  /** Full-completion rate, or null when nothing was eligible. */
  rate: number | null;
  /** Mean capped progress as a percentage, or null when nothing was eligible. */
  progressRate: number | null;
}

export function summarizeDay(habits: HabitDef[], date: ISODate, ctx: Ctx): DaySummary {
  const s: DaySummary = {
    date,
    scheduled: 0,
    eligible: 0,
    completed: 0,
    partial: 0,
    missed: 0,
    pending: 0,
    progressSum: 0,
    rate: null,
    progressRate: null,
  };
  for (const h of habits) {
    for (const o of occurrencesForDay(h, date, ctx)) {
      s.scheduled += 1;
      if (o.status === "future") continue;
      s.eligible += 1;
      s.progressSum += o.progress;
      if (o.status === "complete") s.completed += 1;
      else if (o.status === "partial") s.partial += 1;
      else if (o.status === "missed") s.missed += 1;
      else s.pending += 1;
    }
  }
  s.rate = rate(s.completed, s.eligible);
  s.progressRate = s.eligible > 0 ? (s.progressSum / s.eligible) * 100 : null;
  return s;
}

export function dailySeries(habits: HabitDef[], from: ISODate, to: ISODate, ctx: Ctx): DaySummary[] {
  return eachDay(from, to).map((d) => summarizeDay(habits, d, ctx));
}

export interface Totals {
  scheduled: number;
  eligible: number;
  completed: number;
  partial: number;
  missed: number;
  progressSum: number;
  rate: number | null;
  progressRate: number | null;
  /** Days with at least one eligible occurrence, all of them complete. */
  fullDays: number;
  /** Days with at least one eligible occurrence. */
  activeDays: number;
}

export function totalsOf(series: DaySummary[]): Totals {
  const t = series.reduce(
    (acc, d) => {
      acc.scheduled += d.scheduled;
      acc.eligible += d.eligible;
      acc.completed += d.completed;
      acc.partial += d.partial;
      acc.missed += d.missed;
      acc.progressSum += d.progressSum;
      if (d.eligible > 0) {
        acc.activeDays += 1;
        if (d.completed === d.eligible) acc.fullDays += 1;
      }
      return acc;
    },
    { scheduled: 0, eligible: 0, completed: 0, partial: 0, missed: 0, progressSum: 0, fullDays: 0, activeDays: 0 },
  );
  return {
    ...t,
    rate: rate(t.completed, t.eligible),
    progressRate: t.eligible > 0 ? (t.progressSum / t.eligible) * 100 : null,
  };
}

/** Periods of a periodic habit whose last day falls inside [from, to]. */
export function periodsEndingIn(habit: HabitDef, from: ISODate, to: ISODate, ctx: Ctx): PeriodResult[] {
  const out: PeriodResult[] = [];
  const firstDay = maxDate(habit.startDate, addDays(from, -31));
  const v0 = versionOn(habit, to) ?? versionOn(habit, firstDay);
  if (!v0) return out;
  const freqs = new Set(habit.schedules.map((s) => s.frequency).filter(isPeriodic));
  for (const freq of freqs) {
    let p: Period = periodContaining(freq, firstDay, ctx.weekStartsOn);
    while (p.start <= to) {
      if (p.end >= from && p.end <= to) {
        const r = evaluatePeriod(habit, p, ctx.logs, ctx.today);
        if (r && r.version.frequency === freq) out.push(r);
      }
      p = nextPeriod(freq, p, ctx.weekStartsOn);
    }
  }
  return out.sort((a, b) => a.period.end.localeCompare(b.period.end));
}

export interface HabitStats {
  habitId: string;
  name: string;
  categoryId: string | null;
  kind: "day" | "period";
  /** Day-based: eligible occurrences. Periodic: periods that have ended or been met. */
  eligible: number;
  completed: number;
  partial: number;
  missed: number;
  rate: number | null;
  progressRate: number | null;
}

export function habitStats(habit: HabitDef, from: ISODate, to: ISODate, ctx: Ctx): HabitStats {
  const base = { habitId: habit.id, name: habit.name, categoryId: habit.categoryId };
  const periodic = habit.schedules.some((s) => isPeriodic(s.frequency));
  const dayBased = habit.schedules.some((s) => !isPeriodic(s.frequency));

  let eligible = 0;
  let completed = 0;
  let partial = 0;
  let missed = 0;
  let progressSum = 0;

  if (dayBased) {
    const t = totalsOf(dailySeries([habit], from, to, ctx));
    eligible += t.eligible;
    completed += t.completed;
    partial += t.partial;
    missed += t.missed;
    progressSum += t.progressSum;
  }
  if (periodic) {
    for (const r of periodsEndingIn(habit, from, minDate(to, addDays(ctx.today, 62)), ctx)) {
      if (r.status === "in-progress" || r.status === "upcoming") continue;
      eligible += 1;
      progressSum += r.progress;
      if (r.complete) completed += 1;
      else {
        missed += 1;
        if (r.actual > 0) partial += 1;
      }
    }
  }
  return {
    ...base,
    kind: periodic && !dayBased ? "period" : "day",
    eligible,
    completed,
    partial,
    missed,
    rate: rate(completed, eligible),
    progressRate: eligible > 0 ? (progressSum / eligible) * 100 : null,
  };
}

export interface GroupStats {
  key: string;
  eligible: number;
  completed: number;
  rate: number | null;
}

export function groupStats<T extends HabitStats>(stats: T[], keyOf: (s: T) => string): GroupStats[] {
  const m = new Map<string, GroupStats>();
  for (const s of stats) {
    const k = keyOf(s);
    const g = m.get(k) ?? { key: k, eligible: 0, completed: 0, rate: null };
    g.eligible += s.eligible;
    g.completed += s.completed;
    m.set(k, g);
  }
  return [...m.values()].map((g) => ({ ...g, rate: rate(g.completed, g.eligible) }));
}

export interface WeekBucket {
  start: ISODate;
  end: ISODate;
  eligible: number;
  completed: number;
  rate: number | null;
}

export function bucketByWeek(series: DaySummary[], weekStartsOn: number): WeekBucket[] {
  const out: WeekBucket[] = [];
  for (const d of series) {
    const p = periodContaining("WEEKLY", d.date, weekStartsOn);
    let b = out[out.length - 1];
    if (!b || b.start !== p.start) {
      b = { start: p.start, end: p.end, eligible: 0, completed: 0, rate: null };
      out.push(b);
    }
    b.eligible += d.eligible;
    b.completed += d.completed;
  }
  return out.map((b) => ({ ...b, rate: rate(b.completed, b.eligible) }));
}

export interface Streak {
  current: number;
  longest: number;
  unit: "day" | "week" | "month";
  /** Scheduled units evaluated (successes + misses). */
  successes: number;
  misses: number;
}

/**
 * Day-based: consecutive scheduled days on which every occurrence was complete; days the habit
 * is not scheduled are skipped, not counted. Today does not break a streak until it ends.
 * Periodic: consecutive periods whose target was met; the running period counts once met.
 */
export function streakOf(habit: HabitDef, ctx: Ctx): Streak {
  const v = versionOn(habit, ctx.today) ?? habit.schedules[habit.schedules.length - 1];
  const periodic = v ? isPeriodic(v.frequency) : false;
  const end = habit.archivedOn ? minDate(ctx.today, addDays(habit.archivedOn, -1)) : ctx.today;

  // Units still open (today, the running period) are left out until they succeed or end.
  const outcomes: boolean[] = [];

  if (periodic && v && isPeriodic(v.frequency)) {
    const freq = v.frequency;
    let p = periodContaining(freq, habit.startDate, ctx.weekStartsOn);
    while (p.start <= end) {
      const r = evaluatePeriod(habit, p, ctx.logs, ctx.today);
      if (r && r.version.frequency === freq && (r.status === "complete" || r.status === "missed")) {
        outcomes.push(r.complete);
      }
      p = nextPeriod(freq, p, ctx.weekStartsOn);
    }
  } else {
    for (let d = habit.startDate; d <= end; d = addDays(d, 1)) {
      const occ = occurrencesForDay(habit, d, ctx);
      if (occ.length === 0) continue;
      const done = occ.every((o) => o.complete);
      if (d === ctx.today && !done) continue;
      outcomes.push(done);
    }
  }

  let longest = 0;
  let run = 0;
  for (const ok of outcomes) {
    run = ok ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  return {
    current: run,
    longest,
    unit: periodic && v ? (v.frequency === "WEEKLY" ? "week" : "month") : "day",
    successes: outcomes.filter(Boolean).length,
    misses: outcomes.filter((o) => !o).length,
  };
}

export interface DurationStats {
  totalMinutes: number;
  sessions: number;
  averageMinutes: number | null;
  byHabit: { habitId: string; name: string; categoryId: string | null; minutes: number }[];
}

/** Time actually recorded on duration habits and duration sub-habits. Checkboxes add nothing. */
export function durationStats(habits: HabitDef[], from: ISODate, to: ISODate, ctx: Ctx): DurationStats {
  const byHabit: DurationStats["byHabit"] = [];
  let sessions = 0;
  const last = minDate(to, ctx.today);
  for (const h of habits) {
    let minutes = 0;
    for (const d of eachDay(maxDate(from, h.startDate), last)) {
      if (!isActiveOn(h, d)) continue;
      const v = versionOn(h, d)!;
      const occ = isPeriodic(v.frequency) ? 1 : occurrencesOn(h, d);
      for (let i = 0; i < occ; i++) {
        let m = 0;
        if (v.targetType === "DURATION") m += ctx.logs.habit(h.id, d, i) ?? 0;
        for (const s of subHabitsOn(h, d)) if (s.targetType === "DURATION") m += ctx.logs.sub(s.id, d, i) ?? 0;
        if (m > 0) sessions += 1;
        minutes += m;
      }
    }
    if (minutes > 0) byHabit.push({ habitId: h.id, name: h.name, categoryId: h.categoryId, minutes });
  }
  const totalMinutes = byHabit.reduce((s, b) => s + b.minutes, 0);
  return {
    totalMinutes,
    sessions,
    averageMinutes: sessions > 0 ? totalMinutes / sessions : null,
    byHabit: byHabit.sort((a, b) => b.minutes - a.minutes),
  };
}
