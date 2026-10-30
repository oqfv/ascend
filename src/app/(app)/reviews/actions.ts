"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { isISODate, toDbDate } from "@/lib/domain/dates";
import { requireUser } from "@/lib/session";

const rating = z.number().int().min(1).max(5).nullable();
const reviewInput = z.object({
  date: z.string().refine(isISODate),
  mood: rating,
  energy: rating,
  sleepQuality: rating,
  reflection: z.string().trim().max(4000, "Keep it under 4,000 characters.").nullable(),
});

export type ReviewResult = { ok: true } | { ok: false; error: string };

/** Saves the day's reflection. Journal text is private and is never written to logs. */
export async function saveDailyReview(raw: unknown): Promise<ReviewResult> {
  const user = await requireUser();
  const parsed = reviewInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "That didn't save." };
  const { date, ...fields } = parsed.data;
  if (date > user.today) return { ok: false, error: "You can't review a day that hasn't happened yet." };
  const data = { ...fields, reflection: fields.reflection || null };
  await db.dailyReview.upsert({
    where: { userId_date: { userId: user.id, date: toDbDate(date) } },
    update: data,
    create: { userId: user.id, date: toDbDate(date), ...data },
  });
  revalidatePath("/reviews");
  return { ok: true };
}
