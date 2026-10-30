import "server-only";
import { addDays, maxDate, minDate, type ISODate } from "@/lib/domain/dates";
import { occurrencesForDay, streakOf, summarizeDay, type Ctx, type DaySummary } from "@/lib/domain/analytics";
import { daysLeft, evaluateOccurrence, evaluatePeriod, type OccurrenceStatus, type PeriodStatus } from "@/lib/domain/progress";
import { isActiveOn, isPeriodic, periodContaining, versionOn, type TargetType } from "@/lib/domain/schedule";
import { loadHabits, loadLogs, type HabitView } from "./habits";

/** How far back streaks look. Longer streaks show as "365+". */
export const STREAK_WINDOW_DAYS = 400;

export interface SubItem {
  id: string;
  name: string;
  required: boolean;
  targetType: TargetType;
  target: number;
  unit: string | null;
  actual: number;
  progress: number;
  complete: boolean;
}

export interface DayItem {
  key: string;
  habitId: string;
  name: string;
  categoryName: string | null;
  color: string | null;
  icon: string | null;
  reminderTime: string | null;
  occurrence: number;
  occurrencesToday: number;
  kind: "day" | "period";
  rule: "subhabits" | "self";
  targetType: TargetType;
  target: number;
  unit: string | null;
  actual: number;
  progress: number;
  complete: boolean;
  status: OccurrenceStatus;
  subs: SubItem[];
  streak: { current: number; unit: "day" | "week" | "month"; capped: boolean };
  period: null | {
    label: string;
    targetType: TargetType;
    target: number;
    actual: number;
    remaining: number;
    progress: number;
    status: PeriodStatus;
    daysLeft: number;
  };
}

export interface DayView {
  date: ISODate;
  today: ISODate;
  items: DayItem[];
  summary: DaySummary;
  hasHabits: boolean;
}

export async function loadDay(userId: string, date: ISODate, today: ISODate, weekStartsOn: number): Promise<DayView> {
  const habits = await loadHabits(userId);
  const live = habits.filter((h) => !h.archivedOn || h.archivedOn > date);
  const from = addDays(minDate(date, today), -STREAK_WINDOW_DAYS);
  const { store } = await loadLogs(userId, from, maxDate(date, today));
  const ctx: Ctx = { logs: store, today, weekStartsOn };

  const items: DayItem[] = [];
  for (const h of live) {
    if (!isActiveOn(h, date)) continue;
    const v = versionOn(h, date)!;
    const streak = streakFor(h, ctx, from);
    if (isPeriodic(v.frequency)) {
      const period = periodContaining(v.frequency, date, weekStartsOn);
      const r = evaluatePeriod(h, period, store, today);
      const o = evaluateOccurrence(h, v, date, 0, store, today);
      items.push(toItem(h, o, 1, "period", v.targetType, v.targetUnit, streak, r && {
        label: v.frequency === "WEEKLY" ? "This week" : "This month",
        targetType: v.targetType,
        target: r.target,
        actual: r.actual,
        remaining: r.remaining,
        progress: r.progress,
        status: r.status,
        daysLeft: daysLeft(period, today),
      }));
      continue;
    }
    const occ = occurrencesForDay(h, date, ctx);
    for (const o of occ) items.push(toItem(h, o, occ.length, "day", v.targetType, v.targetUnit, streak, null));
  }

  return {
    date,
    today,
    items,
    summary: summarizeDay(live, date, ctx),
    hasHabits: habits.some((h) => !h.archivedOn),
  };
}

function streakFor(h: HabitView, ctx: Ctx, windowStart: ISODate) {
  const clipped = { ...h, startDate: maxDate(h.startDate, windowStart) };
  const s = streakOf(clipped, ctx);
  return { current: s.current, unit: s.unit, capped: clipped.startDate !== h.startDate && s.current >= 365 };
}

function toItem(
  h: HabitView,
  o: ReturnType<typeof evaluateOccurrence>,
  occurrencesToday: number,
  kind: "day" | "period",
  targetType: TargetType,
  unit: string | null,
  streak: DayItem["streak"],
  period: DayItem["period"],
): DayItem {
  return {
    key: `${h.id}:${o.occurrence}`,
    habitId: h.id,
    name: h.name,
    categoryName: h.categoryName,
    color: h.color,
    icon: h.icon,
    reminderTime: h.reminderEnabled ? h.reminderTime : null,
    occurrence: o.occurrence,
    occurrencesToday,
    kind,
    rule: o.rule,
    targetType,
    target: o.target,
    unit,
    actual: o.actual,
    progress: o.progress,
    complete: o.complete,
    status: o.status,
    subs: o.subs.map((s) => ({
      id: s.sub.id,
      name: s.sub.name,
      required: s.sub.required,
      targetType: s.sub.targetType,
      target: s.target,
      unit: s.sub.targetUnit,
      actual: s.actual,
      progress: s.progress,
      complete: s.complete,
    })),
    streak,
    period,
  };
}
