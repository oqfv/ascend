/**
 * Creates the "ascend_demo" account with six weeks of SAMPLE history, for screenshots only.
 * It never runs automatically and touches no other account. Anything shown from this account
 * must be labelled as sample data.
 *
 *   npx tsx --conditions=react-server scripts/seed-demo.ts <password>
 *
 * Re-running deletes and recreates the demo account.
 */
process.loadEnvFile?.(".env");

import { auth } from "../src/lib/auth";
import { db } from "../src/lib/db";
import { addDays, todayIn, toDbDate, weekday, type ISODate } from "../src/lib/domain/dates";

const USERNAME = "ascend_demo";
const TZ = "Asia/Dubai";
const DAYS = 42;

function rng(seed: number) {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}
const rand = rng(20261027);

type Spec = {
  name: string;
  category: string;
  color: string;
  icon: string;
  frequency: "DAILY" | "WEEKDAYS" | "WEEKLY";
  weekdays?: number[];
  targetType: "CHECKBOX" | "DURATION" | "COUNT" | "QUANTITY";
  targetValue: number;
  targetUnit?: string;
  /** Base chance of a full day at the start; improves over the six weeks. */
  base: number;
  steps?: { name: string; targetType: "CHECKBOX" | "DURATION"; targetValue: number; required: boolean }[];
};

const SPECS: Spec[] = [
  { name: "Read", category: "Reading", color: "teal", icon: "book-open", frequency: "DAILY", targetType: "DURATION", targetValue: 20, base: 0.7 },
  { name: "Study", category: "Education", color: "sky", icon: "graduation-cap", frequency: "WEEKDAYS", weekdays: [1, 2, 3, 4, 5], targetType: "DURATION", targetValue: 60, base: 0.55 },
  { name: "Practice questions", category: "Education", color: "slate", icon: "pencil", frequency: "WEEKDAYS", weekdays: [1, 3, 5], targetType: "COUNT", targetValue: 10, targetUnit: "questions", base: 0.6 },
  { name: "Drink water", category: "Health", color: "ochre", icon: "droplet", frequency: "DAILY", targetType: "QUANTITY", targetValue: 2, targetUnit: "L", base: 0.65 },
  { name: "Meditate", category: "Personal development", color: "moss", icon: "leaf", frequency: "DAILY", targetType: "CHECKBOX", targetValue: 1, base: 0.5 },
  {
    name: "Gym",
    category: "Fitness",
    color: "clay",
    icon: "dumbbell",
    frequency: "WEEKDAYS",
    weekdays: [1, 3, 5, 6],
    targetType: "CHECKBOX",
    targetValue: 1,
    base: 0.6,
    steps: [
      { name: "Cardio", targetType: "DURATION", targetValue: 30, required: true },
      { name: "Weight training", targetType: "DURATION", targetValue: 45, required: true },
      { name: "Stretching", targetType: "CHECKBOX", targetValue: 1, required: false },
    ],
  },
  { name: "Run", category: "Fitness", color: "rose", icon: "footprints", frequency: "WEEKLY", targetType: "CHECKBOX", targetValue: 3, base: 0.35 },
];

async function main() {
  const password = process.argv[2];
  if (!password || password.length < 8) throw new Error("Pass a password of 8+ characters.");

  await db.user.deleteMany({ where: { username: USERNAME } });
  await auth.api.signUpEmail({
    body: { email: `${USERNAME}@example.com`, password, name: "Sara", username: USERNAME, displayUsername: USERNAME },
  });
  const user = await db.user.findUniqueOrThrow({ where: { username: USERNAME } });
  await db.userPreference.update({ where: { userId: user.id }, data: { timezone: TZ } });

  const today = todayIn(TZ);
  const start = addDays(today, -DAYS);
  const categories = new Map((await db.category.findMany({ where: { userId: user.id } })).map((c) => [c.name, c.id]));

  const logs: { userId: string; habitId: string; date: Date; occurrence: number; value: number }[] = [];
  const subLogs: { userId: string; habitId: string; subHabitId: string; date: Date; occurrence: number; value: number }[] = [];

  for (const [order, s] of SPECS.entries()) {
    const habit = await db.habit.create({
      data: {
        userId: user.id,
        name: s.name,
        categoryId: categories.get(s.category) ?? null,
        color: s.color,
        icon: s.icon,
        startDate: toDbDate(start),
        sortOrder: order,
        reminderEnabled: s.name === "Meditate",
        reminderTime: s.name === "Meditate" ? "07:00" : null,
        schedules: {
          create: {
            effectiveFrom: toDbDate(start),
            frequency: s.frequency,
            weekdays: s.weekdays ?? [],
            targetType: s.targetType,
            targetValue: s.targetValue,
            targetUnit: s.targetType === "DURATION" ? "min" : (s.targetUnit ?? null),
          },
        },
        subHabits: s.steps
          ? { create: s.steps.map((st, i) => ({ ...st, targetUnit: st.targetType === "DURATION" ? "min" : null, sortOrder: i, activeFrom: toDbDate(start) })) }
          : undefined,
      },
      include: { subHabits: { orderBy: { sortOrder: "asc" } } },
    });

    for (let i = 0; i <= DAYS; i++) {
      const date: ISODate = addDays(start, i);
      const dow = weekday(date);
      const scheduled =
        s.frequency === "DAILY" || s.frequency === "WEEKLY" ? true : (s.weekdays ?? []).includes(dow);
      if (!scheduled) continue;
      // Today: only the morning habits are in so far.
      if (date === today && !["Meditate", "Drink water", "Read"].includes(s.name)) continue;

      const trend = (i / DAYS) * 0.25; // steady improvement
      const weekend = dow === 5 || dow === 6 ? -0.12 : 0;
      const p = Math.min(0.95, s.base + trend + weekend);
      const roll = rand();

      if (s.frequency === "WEEKLY") {
        // About three runs a week, more often later on.
        if (roll < (3 / 7) * (0.8 + trend)) logs.push({ userId: user.id, habitId: habit.id, date: toDbDate(date), occurrence: 0, value: 1 });
        continue;
      }

      if (s.steps) {
        if (roll > p + 0.15) continue; // skipped
        const full = roll < p;
        for (const sub of habit.subHabits) {
          let value: number;
          if (sub.targetType === "CHECKBOX") value = rand() < 0.6 ? 1 : 0;
          else value = full ? Math.round(sub.targetValue * (0.95 + rand() * 0.3)) : Math.round(sub.targetValue * (0.3 + rand() * 0.5));
          if (value > 0) subLogs.push({ userId: user.id, habitId: habit.id, subHabitId: sub.id, date: toDbDate(date), occurrence: 0, value });
        }
        continue;
      }

      let value = 0;
      if (s.targetType === "CHECKBOX") value = roll < p ? 1 : 0;
      else if (roll < p) value = s.targetValue * (1 + rand() * 0.35);
      else if (roll < p + 0.2) value = s.targetValue * (0.3 + rand() * 0.55);
      if (s.targetType === "DURATION" || s.targetType === "COUNT") value = Math.round(value);
      if (s.targetType === "QUANTITY") value = Math.round(value * 4) / 4;
      if (date === today && s.name === "Read") value = 12; // partly done this morning
      if (value > 0) logs.push({ userId: user.id, habitId: habit.id, date: toDbDate(date), occurrence: 0, value });
    }
  }

  await db.habitLog.createMany({ data: logs });
  await db.subHabitLog.createMany({ data: subLogs });

  const notes = [
    "Studied before work, which made the evening easier.",
    "Skipped the gym. Long day, but kept the reading going.",
    "Good sleep, everything felt lighter.",
    "Weekend reset. Water was the hard one again.",
  ];
  const reviews = Array.from({ length: 12 }, (_, k) => addDays(today, -(k * 3 + 1))).map((date, k) => ({
    userId: user.id,
    date: toDbDate(date),
    mood: 2 + Math.floor(rand() * 4),
    energy: 2 + Math.floor(rand() * 4),
    sleepQuality: 2 + Math.floor(rand() * 4),
    reflection: notes[k % notes.length],
  }));
  await db.dailyReview.createMany({ data: reviews });

  console.log(`Seeded ${USERNAME}: ${SPECS.length} habits, ${logs.length} entries, ${subLogs.length} step entries, ${reviews.length} reviews.`);
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error(e instanceof Error ? e.message : e);
  await db.$disconnect();
  process.exit(1);
});
