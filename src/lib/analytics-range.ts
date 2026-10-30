import { addDays, diffDays, isISODate, type ISODate } from "./domain/dates";

export const RANGES = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "year", label: "This year" },
  { value: "custom", label: "Custom" },
] as const;

export type RangeKey = (typeof RANGES)[number]["value"];

/** Longest custom range, so one request can never ask for unbounded history. */
const MAX_DAYS = 1100;

export function resolveRange(
  s: { range?: string; from?: string; to?: string },
  today: ISODate,
): { range: RangeKey; from: ISODate; to: ISODate } {
  const range = (RANGES.find((r) => r.value === s.range)?.value ?? "30d") as RangeKey;
  if (range === "custom" && s.from && s.to && isISODate(s.from) && isISODate(s.to) && s.from <= s.to) {
    return { range, from: diffDays(s.from, s.to) > MAX_DAYS ? addDays(s.to, -MAX_DAYS) : s.from, to: s.to };
  }
  if (range === "year") return { range, from: `${today.slice(0, 4)}-01-01`, to: today };
  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  return { range: range === "custom" ? "30d" : range, from: addDays(today, -(days - 1)), to: today };
}
