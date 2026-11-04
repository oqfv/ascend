"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { isISODate, toDbDate } from "@/lib/domain/dates";
import { exerciseName } from "@/lib/data/workouts";
import { customKey, EXERCISE_GROUPS } from "@/lib/exercises";
import { requireUser } from "@/lib/session";

export type WorkoutResult = { ok: true } | { ok: false; error: string };

const setInput = z.object({
  date: z.string().refine(isISODate),
  exercise: z.string().min(1).max(40),
  reps: z.number().int().min(1, "Enter at least 1 rep.").max(500, "Use at most 500 reps."),
  weightKg: z.number().min(0, "Weight can't be negative.").max(1000, "Use at most 1000 kg."),
});

/** Adds one set to the user's workout for that day, creating the workout if needed. */
export async function addSet(raw: unknown): Promise<WorkoutResult> {
  const user = await requireUser();
  const parsed = setInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "That set isn't valid." };
  const { date, exercise, reps, weightKg } = parsed.data;
  if (date > user.today) return { ok: false, error: "You can't log a workout for a future day." };
  // The exercise must be built in or one of this user's own; the name is looked up, never taken from the browser.
  const name = await exerciseName(user.id, exercise);
  if (!name) return { ok: false, error: "Choose an exercise from the list." };

  const day = toDbDate(date);
  const workout = await db.workout.upsert({
    where: { userId_date: { userId: user.id, date: day } },
    update: {},
    create: { userId: user.id, date: day },
    select: { id: true, _count: { select: { sets: true } } },
  });
  await db.workoutSet.create({
    data: { userId: user.id, workoutId: workout.id, exercise, exerciseName: name, reps, weightKg: Math.round(weightKg * 100) / 100, position: workout._count.sets },
  });
  revalidatePath("/workouts", "layout");
  return { ok: true };
}

export async function deleteSet(setId: string): Promise<WorkoutResult> {
  const user = await requireUser();
  const { count } = await db.workoutSet.deleteMany({ where: { id: String(setId), userId: user.id } });
  if (count === 0) return { ok: false, error: "That set no longer exists." };
  revalidatePath("/workouts", "layout");
  return { ok: true };
}

const customInput = z.object({
  name: z.string().trim().min(1, "Name the exercise.").max(60, "Use at most 60 characters."),
  group: z.enum(EXERCISE_GROUPS),
});

export type CustomResult = { ok: true; key: string } | { ok: false; error: string };

export async function addCustomExercise(raw: unknown): Promise<CustomResult> {
  const user = await requireUser();
  const parsed = customInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "That exercise isn't valid." };
  if ((await db.customExercise.count({ where: { userId: user.id } })) >= 200) return { ok: false, error: "You can have up to 200 of your own exercises." };
  try {
    const c = await db.customExercise.create({ data: { userId: user.id, ...parsed.data } });
    revalidatePath("/workouts", "layout");
    return { ok: true, key: customKey(c.id) };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { ok: false, error: "You already have an exercise with that name." };
    throw e;
  }
}
