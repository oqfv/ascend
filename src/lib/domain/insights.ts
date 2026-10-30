// Deterministic insights: plain sentences built from computed numbers, each stating its period
// and figures. No model writes these, and none is shown without enough data behind it.

import type { HabitStats } from "./analytics";

export interface Insight {
  kind: "change" | "target" | "consistency" | "focus" | "pattern";
  text: string;
}

export interface InsightInput {
  periodLabel: string; // "this week", "in October"
  previousLabel: string; // "last week", "in September"
  rate: number | null;
  prevRate: number | null;
  eligible: number;
  habits: (HabitStats & { prevRate: number | null })[];
  targets: { name: string; actual: number; target: number; unit: string; status: string; daysLeft: number }[];
  weekdayRates: { weekday: string; rate: number | null; eligible: number }[];
}

/** Minimum due occurrences before a rate is worth a sentence. */
export const MIN_SAMPLE = 5;

const pct = (n: number) => `${Math.round(n)}%`;

export function buildInsights(i: InsightInput): Insight[] {
  const out: Insight[] = [];

  if (i.rate !== null && i.prevRate !== null && i.eligible >= MIN_SAMPLE) {
    const d = i.rate - i.prevRate;
    if (Math.abs(d) >= 5) {
      out.push({
        kind: "change",
        text: `Your completion rate ${d > 0 ? "rose" : "fell"} from ${pct(i.prevRate)} ${i.previousLabel} to ${pct(i.rate)} ${i.periodLabel}.`,
      });
    }
  }

  const movers = i.habits
    .filter((h) => h.rate !== null && h.prevRate !== null && h.eligible >= MIN_SAMPLE)
    .map((h) => ({ h, d: h.rate! - h.prevRate! }))
    .sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
  const mover = movers[0];
  if (mover && Math.abs(mover.d) >= 15) {
    out.push({
      kind: "change",
      text: `${mover.h.name} went from ${pct(mover.h.prevRate!)} ${i.previousLabel} to ${pct(mover.h.rate!)} ${i.periodLabel}.`,
    });
  }

  for (const t of i.targets) {
    if (t.status === "in-progress" && t.actual < t.target) {
      out.push({
        kind: "target",
        text: `${t.name}: ${fmt(t.actual)} of ${fmt(t.target)} ${t.unit} done, ${fmt(t.target - t.actual)} to go with ${t.daysLeft} ${t.daysLeft === 1 ? "day" : "days"} left.`,
      });
    } else if (t.status === "complete") {
      out.push({ kind: "target", text: `${t.name}: target met, ${fmt(t.actual)} of ${fmt(t.target)} ${t.unit}.` });
    } else if (t.status === "missed") {
      out.push({ kind: "target", text: `${t.name}: ${fmt(t.actual)} of ${fmt(t.target)} ${t.unit}, short of the target.` });
    }
  }

  const steady = i.habits.filter((h) => h.eligible >= MIN_SAMPLE && h.rate !== null);
  if (steady.length >= 2) {
    const best = steady.reduce((a, b) => (b.rate! > a.rate! ? b : a));
    const worst = steady.reduce((a, b) => (b.rate! < a.rate! ? b : a));
    if (best.rate! >= 80) {
      out.push({ kind: "consistency", text: `${best.name} was your most consistent habit ${i.periodLabel}: ${best.completed} of ${best.eligible} done.` });
    }
    if (worst.habitId !== best.habitId && worst.rate! < 50) {
      out.push({
        kind: "focus",
        text: `${worst.name} was done ${worst.completed} of ${worst.eligible} times ${i.periodLabel}. It's the one with the most room to improve.`,
      });
    }
  }

  const days = i.weekdayRates.filter((w) => w.rate !== null && w.eligible >= 3);
  if (days.length >= 4) {
    const low = days.reduce((a, b) => (b.rate! < a.rate! ? b : a));
    const avg = days.reduce((s, w) => s + w.rate!, 0) / days.length;
    if (avg - low.rate! >= 20) {
      out.push({ kind: "pattern", text: `${low.weekday}s are your hardest day: ${pct(low.rate!)} done, against ${pct(avg)} on an average day.` });
    }
  }

  return out;
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
