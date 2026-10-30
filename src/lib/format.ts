// Display formatting. Dates are calendar labels, so they are formatted in UTC to avoid any shift.

import type { ISODate } from "./domain/dates";
import type { TargetType } from "./domain/schedule";

const asDate = (d: ISODate) => new Date(`${d}T00:00:00Z`);

export function formatDay(d: ISODate, style: "long" | "medium" | "short" = "medium"): string {
  const opts: Intl.DateTimeFormatOptions =
    style === "long"
      ? { weekday: "long", day: "numeric", month: "long", year: "numeric" }
      : style === "medium"
        ? { weekday: "short", day: "numeric", month: "short" }
        : { day: "numeric", month: "short" };
  return new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: "UTC" }).format(asDate(d));
}

export function formatMonth(d: ISODate): string {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(asDate(d));
}

export function weekdayName(d: ISODate): string {
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "UTC" }).format(asDate(d));
}

export function formatRange(from: ISODate, to: ISODate): string {
  if (from === to) return formatDay(from, "short");
  const sameYear = from.slice(0, 4) === to.slice(0, 4);
  const f = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
    timeZone: "UTC",
  });
  const t = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  return `${f.format(asDate(from))} – ${t.format(asDate(to))}`;
}

const trim = (n: number, digits = 1) => Number(n.toFixed(digits)).toLocaleString("en-US", { maximumFractionDigits: digits });

export function formatMinutes(min: number): string {
  if (min < 60) return `${trim(min, 0)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min - h * 60);
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** A recorded amount with its unit: "35 min", "12 pages", "1.5 L". */
export function formatAmount(value: number, type: TargetType, unit: string | null): string {
  if (type === "DURATION") return formatMinutes(value);
  if (type === "CHECKBOX") return value >= 1 ? "Done" : "Not done";
  return `${trim(value, 2)}${unit ? ` ${unit}` : ""}`;
}

/** Actual against target: "35 / 60 min", "1.2 / 2 L". */
export function formatProgress(actual: number, target: number, type: TargetType, unit: string | null): string {
  if (type === "DURATION") {
    return target >= 60 && target % 60 === 0
      ? `${formatMinutes(actual)} of ${formatMinutes(target)}`
      : `${trim(actual, 0)} / ${trim(target, 0)} min`;
  }
  return `${trim(actual, 2)} / ${trim(target, 2)}${unit ? ` ${unit}` : ""}`;
}

export function formatPercent(p: number | null, digits = 0): string {
  return p === null ? "–" : `${p.toFixed(digits)}%`;
}

export function formatPoints(delta: number | null): string {
  if (delta === null) return "–";
  if (Math.abs(delta) < 0.05) return "No change";
  return `${delta > 0 ? "+" : "−"}${Math.abs(delta).toFixed(1)} pts`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
}

export function greetingFor(minutes: number): string {
  if (minutes < 5 * 60) return "Good evening";
  if (minutes < 12 * 60) return "Good morning";
  if (minutes < 18 * 60) return "Good afternoon";
  return "Good evening";
}
