// Workout maths: estimated one-rep max, personal bests and progress per session. Pure functions only.

import type { ISODate } from "./dates";

export interface SetRow {
  date: ISODate;
  exercise: string;
  reps: number;
  weightKg: number;
}

/**
 * Estimated one-rep max (Epley): weight × (1 + reps / 30). A single rep is its own max.
 * Bodyweight sets (0 kg) have no meaningful estimate and return 0.
 */
export function estimatedOneRepMax(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

export interface SessionSummary {
  date: ISODate;
  sets: number;
  topWeightKg: number;
  /** Most reps in one set: the measure for bodyweight exercises. */
  topReps: number;
  bestEstimatedMax: number;
  /** Sum of weight × reps across the session. */
  volumeKg: number;
}

/** One summary per date for one exercise, oldest first. */
export function sessionsOf(sets: SetRow[]): SessionSummary[] {
  const byDate = new Map<ISODate, SessionSummary>();
  for (const s of sets) {
    const cur = byDate.get(s.date) ?? { date: s.date, sets: 0, topWeightKg: 0, topReps: 0, bestEstimatedMax: 0, volumeKg: 0 };
    cur.sets += 1;
    cur.topWeightKg = Math.max(cur.topWeightKg, s.weightKg);
    cur.topReps = Math.max(cur.topReps, s.reps);
    cur.bestEstimatedMax = Math.max(cur.bestEstimatedMax, estimatedOneRepMax(s.weightKg, s.reps));
    cur.volumeKg += s.weightKg * s.reps;
    byDate.set(s.date, cur);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export interface PersonalBests {
  heaviestKg: number;
  heaviestOn: ISODate | null;
  mostReps: number;
  bestEstimatedMax: number;
  sessions: number;
}

export function personalBests(sets: SetRow[]): PersonalBests {
  const pb: PersonalBests = { heaviestKg: 0, heaviestOn: null, mostReps: 0, bestEstimatedMax: 0, sessions: 0 };
  for (const s of sets) {
    if (s.weightKg > pb.heaviestKg || (s.weightKg === pb.heaviestKg && pb.heaviestOn !== null && s.date < pb.heaviestOn)) {
      pb.heaviestKg = s.weightKg;
      pb.heaviestOn = s.date;
    }
    pb.mostReps = Math.max(pb.mostReps, s.reps);
    pb.bestEstimatedMax = Math.max(pb.bestEstimatedMax, estimatedOneRepMax(s.weightKg, s.reps));
  }
  pb.sessions = new Set(sets.map((s) => s.date)).size;
  return pb;
}

/**
 * Whether a set beat everything logged for that exercise before its day.
 * Weighted exercises compare weight; bodyweight ones (0 kg) compare reps. A first ever set is not a record.
 */
export function isPersonalBest(set: SetRow, earlier: SetRow[]): boolean {
  const before = earlier.filter((s) => s.exercise === set.exercise && s.date < set.date);
  if (before.length === 0) return false;
  if (set.weightKg > 0) return set.weightKg > Math.max(...before.map((s) => s.weightKg));
  return set.reps > Math.max(...before.filter((s) => s.weightKg === 0).map((s) => s.reps), 0);
}
