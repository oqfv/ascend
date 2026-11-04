import "server-only";
import { db } from "@/lib/db";
import { fromDbDate, toDbDate, type ISODate } from "@/lib/domain/dates";
import type { SetRow } from "@/lib/domain/workouts";
import { builtInExercise, customIdOf, customKey, EXERCISES, type ExerciseGroup } from "@/lib/exercises";

export type ExerciseOption = { key: string; name: string; group: ExerciseGroup | string; custom: boolean };

/** Built-in exercises followed by the user's own. */
export async function loadExerciseOptions(userId: string): Promise<ExerciseOption[]> {
  const custom = await db.customExercise.findMany({ where: { userId }, orderBy: { name: "asc" } });
  return [
    ...EXERCISES.map((e) => ({ ...e, custom: false })),
    ...custom.map((c) => ({ key: customKey(c.id), name: c.name, group: c.group, custom: true })),
  ];
}

/** The display name for an exercise key, only if the key belongs to this user (or is built in). */
export async function exerciseName(userId: string, key: string): Promise<string | null> {
  const built = builtInExercise(key);
  if (built) return built.name;
  const id = customIdOf(key);
  if (!id) return null;
  const c = await db.customExercise.findFirst({ where: { id, userId }, select: { name: true } });
  return c?.name ?? null;
}

export async function loadWorkoutDay(userId: string, date: ISODate) {
  const w = await db.workout.findUnique({
    where: { userId_date: { userId, date: toDbDate(date) } },
    include: { sets: { orderBy: [{ position: "asc" }, { createdAt: "asc" }] } },
  });
  return w?.sets ?? [];
}

/** Every set the user has logged for the given exercises, for records and charts. */
export async function loadSetHistory(userId: string, exercises?: string[]): Promise<(SetRow & { id: string; name: string })[]> {
  const rows = await db.workoutSet.findMany({
    where: { userId, ...(exercises ? { exercise: { in: exercises } } : {}) },
    select: { id: true, exercise: true, exerciseName: true, reps: true, weightKg: true, workout: { select: { date: true } } },
  });
  return rows.map((r) => ({ id: r.id, exercise: r.exercise, name: r.exerciseName, reps: r.reps, weightKg: r.weightKg, date: fromDbDate(r.workout.date) }));
}

/** Days with a workout, newest first. */
export async function loadRecentWorkouts(userId: string, limit = 10) {
  const rows = await db.workout.findMany({
    where: { userId, sets: { some: {} } },
    orderBy: { date: "desc" },
    take: limit,
    select: { date: true, sets: { select: { exerciseName: true } } },
  });
  return rows.map((r) => ({ date: fromDbDate(r.date), sets: r.sets.length, exercises: [...new Set(r.sets.map((s) => s.exerciseName))] }));
}
