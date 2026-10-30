// Client-side mirror of evaluateOccurrence for optimistic updates. The server's result replaces
// it as soon as the action revalidates, so this only has to agree on the visible outcome.

import type { DayItem } from "@/lib/data/day";
import { statusOf, ratio } from "@/lib/domain/progress";

export type Overrides = Record<string, number>; // "h:<key>" or "s:<key>:<subId>" -> value

export const habitKey = (item: DayItem) => `h:${item.key}`;
export const subKey = (item: DayItem, subId: string) => `s:${item.key}:${subId}`;

export function applyOverrides(item: DayItem, o: Overrides, date: string, today: string): DayItem {
  const subs = item.subs.map((s) => {
    const actual = o[subKey(item, s.id)] ?? s.actual;
    return { ...s, actual, progress: ratio(actual, s.target), complete: actual >= s.target };
  });
  if (item.rule === "subhabits") {
    const required = subs.filter((s) => s.required);
    const progress = required.reduce((sum, s) => sum + s.progress, 0) / Math.max(1, required.length);
    const complete = required.every((s) => s.complete);
    return {
      ...item,
      subs,
      actual: required.filter((s) => s.complete).length,
      progress,
      complete,
      status: statusOf(date, today, progress, complete),
    };
  }
  const actual = o[habitKey(item)] ?? item.actual;
  const complete = item.target > 0 ? actual >= item.target : actual > 0;
  const progress = item.target > 0 ? ratio(actual, item.target) : actual > 0 ? 1 : 0;
  return { ...item, subs, actual, progress, complete, status: statusOf(date, today, progress, complete) };
}
