import "server-only";
import { addDays, diffDays, endOfMonth, maxDate, minDate, startOfMonth, type ISODate } from "@/lib/domain/dates";
import {
  bucketByWeek,
  dailySeries,
  durationStats,
  groupStats,
  habitStats,
  periodsEndingIn,
  pointChange,
  rate,
  streakOf,
  totalsOf,
  type Ctx,
  type DaySummary,
} from "@/lib/domain/analytics";
import { daysLeft } from "@/lib/domain/progress";
import { isPeriodic } from "@/lib/domain/schedule";
import { loadHabits, loadLogs, type HabitView } from "./habits";

export type Granularity = "day" | "week" | "month";

export interface AnalyticsQuery {
  from: ISODate;
  to: ISODate;
  habitId: string | null;
  categoryId: string | null;
  compare: boolean;
}

export interface TrendPoint {
  start: ISODate;
  end: ISODate;
  rate: number | null;
  completed: number;
  eligible: number;
  prevRate: number | null;
  prevCompleted: number | null;
  prevEligible: number | null;
}

/** Granularity follows the range so a year never draws 365 jittery points. */
export function granularityFor(days: number): Granularity {
  return days <= 45 ? "day" : days <= 200 ? "week" : "month";
}

function bucket(series: DaySummary[], g: Granularity, weekStartsOn: number) {
  if (g === "day") return series.map((d) => ({ start: d.date, end: d.date, completed: d.completed, eligible: d.eligible }));
  if (g === "week") return bucketByWeek(series, weekStartsOn).map((b) => ({ start: b.start, end: b.end, completed: b.completed, eligible: b.eligible }));
  const out: { start: ISODate; end: ISODate; completed: number; eligible: number }[] = [];
  for (const d of series) {
    const m = { start: startOfMonth(d.date), end: endOfMonth(d.date) };
    let b = out[out.length - 1];
    if (!b || b.start !== m.start) out.push((b = { start: m.start, end: m.end, completed: 0, eligible: 0 }));
    b.completed += d.completed;
    b.eligible += d.eligible;
  }
  return out;
}

export async function loadAnalytics(userId: string, q: AnalyticsQuery, today: ISODate, weekStartsOn: number) {
  const all = await loadHabits(userId);
  const habits = all.filter((h) => (!q.habitId || h.id === q.habitId) && (!q.categoryId || h.categoryId === q.categoryId));
  const span = diffDays(q.from, q.to) + 1;
  const prevTo = addDays(q.from, -1);
  const prevFrom = addDays(q.from, -span);
  const earliest = addDays(minDate(prevFrom, q.from), -400); // streak history
  const { store } = await loadLogs(userId, earliest, maxDate(q.to, today));
  const ctx: Ctx = { logs: store, today, weekStartsOn };

  const series = dailySeries(habits, q.from, q.to, ctx);
  const prevSeries = dailySeries(habits, prevFrom, prevTo, ctx);
  const totals = totalsOf(series);
  const prevTotals = totalsOf(prevSeries);
  const hasPrev = prevTotals.eligible > 0;

  const g = granularityFor(span);
  const cur = bucket(series, g, weekStartsOn);
  const prev = bucket(prevSeries, g, weekStartsOn);
  const trend: TrendPoint[] = cur.map((b, i) => {
    const p = q.compare && hasPrev ? prev[i] : undefined;
    return {
      start: b.start,
      end: b.end,
      completed: b.completed,
      eligible: b.eligible,
      rate: rate(b.completed, b.eligible),
      prevCompleted: p ? p.completed : null,
      prevEligible: p ? p.eligible : null,
      prevRate: p ? rate(p.completed, p.eligible) : null,
    };
  });

  const visible = habits.filter((h) => h.startDate <= q.to);
  const perHabit = visible.map((h) => {
    const s = habitStats(h, maxDate(q.from, h.startDate), q.to, ctx);
    const prevS = habitStats(h, maxDate(prevFrom, h.startDate), prevTo, ctx);
    return { ...s, color: h.color, categoryName: h.categoryName, prevRate: prevS.rate, archived: Boolean(h.archivedOn) };
  });
  const catNames = new Map(all.map((h) => [h.categoryId ?? "", h.categoryName ?? "No category"]));
  const categories = groupStats(perHabit, (s) => s.categoryId ?? "")
    .map((c) => ({ ...c, name: catNames.get(c.key) ?? "No category" }))
    .filter((c) => c.eligible > 0)
    .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1));

  const weeks = bucketByWeek(series, weekStartsOn).filter((w) => w.start <= today);

  const targets = visible
    .flatMap((h) =>
      periodsEndingIn(h, q.from, maxDate(q.to, addDays(today, 31)), ctx)
        .filter((r) => r.period.start <= q.to)
        .map((r) => ({
          habitId: h.id,
          name: h.name,
          color: h.color,
          frequency: r.version.frequency as "WEEKLY" | "MONTHLY",
          targetType: r.version.targetType,
          unit: r.version.targetUnit,
          start: r.period.start,
          end: r.period.end,
          target: r.target,
          actual: r.actual,
          remaining: r.remaining,
          progress: r.progress,
          status: r.status,
          daysLeft: daysLeft(r.period, today),
        })),
    )
    .sort((a, b) => b.end.localeCompare(a.end) || a.name.localeCompare(b.name));

  const streaks = visible
    .filter((h) => !h.archivedOn)
    .map((h) => ({ habitId: h.id, name: h.name, color: h.color, ...streakOf(h, ctx) }))
    .sort((a, b) => b.current - a.current || b.longest - a.longest);

  const time = durationStats(habits, q.from, q.to, ctx);
  const prevTime = durationStats(habits, prevFrom, prevTo, ctx);
  const timeByCategory = [...groupMinutes(time.byHabit, habits)].sort((a, b) => b.minutes - a.minutes);
  const timeWeeks = weeklyMinutes(habits, q.from, minDate(q.to, today), ctx, weekStartsOn);

  return {
    query: q,
    span,
    granularity: g,
    prevFrom,
    prevTo,
    habitsInScope: habits.length,
    totals,
    prevTotals: hasPrev ? prevTotals : null,
    change: pointChange(totals.rate, hasPrev ? prevTotals.rate : null),
    trend,
    series: series.map((d) => ({ date: d.date, scheduled: d.scheduled, eligible: d.eligible, completed: d.completed, rate: d.rate })),
    perHabit,
    categories,
    weeks,
    targets,
    streaks,
    time: {
      ...time,
      prevTotalMinutes: prevTime.sessions > 0 ? prevTime.totalMinutes : null,
      byCategory: timeByCategory,
      weeks: timeWeeks,
    },
    hasDurationHabits: habits.some((h) => h.schedules.some((s) => s.targetType === "DURATION") || h.subHabits.some((s) => s.targetType === "DURATION")),
    hasPeriodic: habits.some((h) => h.schedules.some((s) => isPeriodic(s.frequency))),
  };
}

export type AnalyticsData = Awaited<ReturnType<typeof loadAnalytics>>;

function groupMinutes(byHabit: { habitId: string; categoryId: string | null; minutes: number }[], habits: HabitView[]) {
  const names = new Map(habits.map((h) => [h.categoryId ?? "", h.categoryName ?? "No category"]));
  const m = new Map<string, number>();
  for (const b of byHabit) m.set(b.categoryId ?? "", (m.get(b.categoryId ?? "") ?? 0) + b.minutes);
  return [...m.entries()].map(([k, minutes]) => ({ name: names.get(k) ?? "No category", minutes }));
}

function weeklyMinutes(habits: HabitView[], from: ISODate, to: ISODate, ctx: Ctx, weekStartsOn: number) {
  if (to < from) return [];
  const out: { start: ISODate; minutes: number }[] = [];
  for (const w of bucketByWeek(dailySeries([], from, to, ctx), weekStartsOn)) {
    const s = durationStats(habits, maxDate(w.start, from), minDate(w.end, to), ctx);
    out.push({ start: w.start, minutes: s.totalMinutes });
  }
  return out;
}
