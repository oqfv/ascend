import "server-only";
import { db } from "@/lib/db";
import { addDays, addMonths, endOfMonth, endOfWeek, fromDbDate, maxDate, minDate, startOfMonth, startOfWeek, toDbDate, weekday, type ISODate } from "@/lib/domain/dates";
import {
  dailySeries,
  durationStats,
  groupStats,
  habitStats,
  occurrencesForDay,
  periodsEndingIn,
  pointChange,
  rate,
  streakOf,
  totalsOf,
  type Ctx,
} from "@/lib/domain/analytics";
import { daysLeft } from "@/lib/domain/progress";
import { versionOn } from "@/lib/domain/schedule";
import { buildInsights } from "@/lib/domain/insights";
import { formatMonth } from "@/lib/format";
import { loadHabits, loadLogs, type HabitView } from "./habits";

export type ReviewView = "day" | "week" | "month";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function periodFor(view: ReviewView, date: ISODate, weekStartsOn: number) {
  if (view === "day") return { from: date, to: date, prevFrom: addDays(date, -1), prevTo: addDays(date, -1) };
  if (view === "week") {
    const from = startOfWeek(date, weekStartsOn);
    return { from, to: endOfWeek(date, weekStartsOn), prevFrom: addDays(from, -7), prevTo: addDays(from, -1) };
  }
  const from = startOfMonth(date);
  const prev = addMonths(from, -1);
  return { from, to: endOfMonth(date), prevFrom: prev, prevTo: endOfMonth(prev) };
}

function streakAsOf(h: HabitView, ctx: Ctx, asOf: ISODate) {
  return streakOf(h, { ...ctx, today: asOf });
}

export async function loadReview(userId: string, view: ReviewView, date: ISODate, today: ISODate, weekStartsOn: number) {
  const p = periodFor(view, date, weekStartsOn);
  const habits = await loadHabits(userId);
  const { store, logRows } = await loadLogs(userId, addDays(p.prevFrom, -400), maxDate(p.to, today));
  const ctx: Ctx = { logs: store, today, weekStartsOn };
  const end = minDate(p.to, today);

  const series = dailySeries(habits, p.from, p.to, ctx);
  const totals = totalsOf(series);
  const prevTotals = totalsOf(dailySeries(habits, p.prevFrom, p.prevTo, ctx));
  const inScope = habits.filter((h) => h.startDate <= p.to && (!h.archivedOn || h.archivedOn > p.from));

  const perHabit = inScope
    .map((h) => ({
      ...habitStats(h, maxDate(p.from, h.startDate), p.to, ctx),
      prevRate: habitStats(h, maxDate(p.prevFrom, h.startDate), p.prevTo, ctx).rate,
      color: h.color,
      categoryName: h.categoryName,
      streakNow: streakAsOf(h, ctx, end),
      streakBefore: streakAsOf(h, ctx, addDays(p.from, -1)),
    }))
    .filter((h) => h.eligible > 0);

  const targets = inScope.flatMap((h) =>
    periodsEndingIn(h, p.from, view === "day" ? addDays(p.to, 31) : p.to, ctx)
      .filter((r) => r.period.start <= p.to)
      .map((r) => ({
        habitId: h.id,
        name: h.name,
        frequency: r.version.frequency,
        targetType: r.version.targetType,
        unit: r.version.targetType === "CHECKBOX" ? "sessions" : r.version.targetType === "DURATION" ? "min" : (r.version.targetUnit ?? ""),
        target: r.target,
        actual: r.actual,
        status: r.status,
        daysLeft: daysLeft(r.period, today),
        start: r.period.start,
        end: r.period.end,
      })),
  );

  // Rates by weekday across the period (month view), for "best day" and patterns.
  const byWeekday = Array.from({ length: 7 }, (_, d) => {
    const days = series.filter((s) => weekday(s.date) === d);
    const completed = days.reduce((a, s) => a + s.completed, 0);
    const eligible = days.reduce((a, s) => a + s.eligible, 0);
    return { weekday: WEEKDAYS[d], completed, eligible, rate: rate(completed, eligible) };
  });

  const categories = groupStats(perHabit, (s) => s.categoryName ?? "No category");

  const time = durationStats(habits, p.from, p.to, ctx);

  // Day view: one row per scheduled occurrence, with its steps.
  const dayItems =
    view === "day"
      ? inScope.flatMap((h) => {
          const occ = occurrencesForDay(h, date, ctx);
          const v = versionOn(h, date);
          return occ.map((o) => ({
            habitId: h.id,
            name: h.name,
            color: h.color,
            occurrence: o.occurrence,
            count: occ.length,
            status: o.status,
            progress: o.progress,
            rule: o.rule,
            actual: o.actual,
            target: o.target,
            targetType: v?.targetType ?? "CHECKBOX",
            unit: v?.targetUnit ?? null,
            subs: o.subs.map((s) => ({
              name: s.sub.name,
              required: s.sub.required,
              progress: s.progress,
              complete: s.complete,
              actual: s.actual,
              target: s.target,
              targetType: s.sub.targetType,
              unit: s.sub.targetUnit,
            })),
          }));
        })
      : [];

  const reviews = await db.dailyReview.findMany({
    where: { userId, date: { gte: toDbDate(p.from), lte: toDbDate(p.to) } },
    orderBy: { date: "asc" },
  });

  const periodLabel = view === "day" ? "today" : view === "week" ? "this week" : `in ${formatMonth(p.from).split(" ")[0]}`;
  const previousLabel = view === "day" ? "the day before" : view === "week" ? "the week before" : `in ${formatMonth(p.prevFrom).split(" ")[0]}`;
  const insights =
    view === "day"
      ? []
      : buildInsights({
          periodLabel,
          previousLabel,
          rate: totals.rate,
          prevRate: prevTotals.eligible > 0 ? prevTotals.rate : null,
          eligible: totals.eligible,
          habits: perHabit,
          targets: targets.map((t) => ({ ...t })),
          weekdayRates: byWeekday,
        });

  return {
    view,
    ...p,
    today,
    totals,
    prevTotals: prevTotals.eligible > 0 ? prevTotals : null,
    change: pointChange(totals.rate, prevTotals.eligible > 0 ? prevTotals.rate : null),
    series,
    perHabit,
    targets,
    byWeekday,
    categories: categories.filter((c) => c.eligible > 0).sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1)),
    time,
    dayItems,
    hasEntries: logRows.some((l) => l.date >= p.from && l.date <= p.to),
    reviews: reviews.map((r) => ({
      date: fromDbDate(r.date),
      reflection: r.reflection,
      mood: r.mood,
      energy: r.energy,
      sleepQuality: r.sleepQuality,
    })),
    insights,
  };
}

export type ReviewData = Awaited<ReturnType<typeof loadReview>>;
