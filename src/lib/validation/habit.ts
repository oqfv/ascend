import { z } from "zod";
import { HABIT_COLORS, HABIT_ICONS } from "@/lib/constants";
import { isISODate } from "@/lib/domain/dates";

const isoDate = z.string().refine(isISODate, "Use a valid date.");
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a time like 07:30.");

export const TARGET_TYPES = ["CHECKBOX", "DURATION", "COUNT", "QUANTITY"] as const;
export const FREQUENCIES = ["DAILY", "WEEKDAYS", "INTERVAL", "WEEKLY", "MONTHLY"] as const;

export const subHabitInput = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Name the step.").max(80, "Use at most 80 characters."),
  targetType: z.enum(TARGET_TYPES),
  targetValue: z.number().positive("Use a number above 0.").max(100000),
  targetUnit: z.string().trim().max(20).nullable(),
  required: z.boolean(),
});

export const habitInput = z
  .object({
    name: z.string().trim().min(1, "Name the habit.").max(80, "Use at most 80 characters."),
    description: z.string().trim().max(500, "Use at most 500 characters.").nullable(),
    categoryId: z.string().nullable(),
    newCategory: z.string().trim().max(40, "Use at most 40 characters.").nullable(),
    icon: z.enum(HABIT_ICONS).nullable(),
    color: z.enum(HABIT_COLORS).nullable(),
    startDate: isoDate,
    endDate: isoDate.nullable(),
    frequency: z.enum(FREQUENCIES),
    weekdays: z.array(z.number().int().min(0).max(6)),
    intervalDays: z.number().int().min(2, "Use 2 days or more.").max(365).nullable(),
    timesPerDay: z.number().int().min(1).max(10, "Use at most 10 a day."),
    targetType: z.enum(TARGET_TYPES),
    /** Per occurrence for day-based habits; per period for weekly/monthly. Minutes for durations. */
    targetValue: z.number().positive("Use a number above 0.").max(100000),
    targetUnit: z.string().trim().max(20).nullable(),
    requireSubHabits: z.boolean(),
    reminderEnabled: z.boolean(),
    reminderTime: hhmm.nullable(),
    subHabits: z.array(subHabitInput).max(20, "Use at most 20 steps."),
  })
  .superRefine((v, ctx) => {
    const periodic = v.frequency === "WEEKLY" || v.frequency === "MONTHLY";
    if (v.frequency === "WEEKDAYS" && v.weekdays.length === 0) {
      ctx.addIssue({ code: "custom", path: ["weekdays"], message: "Pick at least one day." });
    }
    if (v.frequency === "INTERVAL" && !v.intervalDays) {
      ctx.addIssue({ code: "custom", path: ["intervalDays"], message: "Set how many days apart." });
    }
    if (v.endDate && v.endDate < v.startDate) {
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "End after the start date." });
    }
    if (periodic && v.subHabits.length > 0 && v.targetType !== "CHECKBOX") {
      ctx.addIssue({
        code: "custom",
        path: ["targetType"],
        message: "Weekly and monthly habits with steps count sessions. Choose “Sessions”.",
      });
    }
    if (v.reminderEnabled && !v.reminderTime) {
      ctx.addIssue({ code: "custom", path: ["reminderTime"], message: "Choose a reminder time." });
    }
    if ((v.targetType === "COUNT" || v.targetType === "QUANTITY") && !v.targetUnit) {
      ctx.addIssue({ code: "custom", path: ["targetUnit"], message: "Name the unit, such as pages or L." });
    }
  });

export type HabitInput = z.infer<typeof habitInput>;
export type SubHabitInput = z.infer<typeof subHabitInput>;

/** Normalises fields that depend on others, so equal habits always store the same way. */
export function normalizeHabit(v: HabitInput): HabitInput {
  const periodic = v.frequency === "WEEKLY" || v.frequency === "MONTHLY";
  return {
    ...v,
    weekdays: v.frequency === "WEEKDAYS" ? [...new Set(v.weekdays)].sort() : [],
    intervalDays: v.frequency === "INTERVAL" ? v.intervalDays : null,
    timesPerDay: periodic ? 1 : v.timesPerDay,
    targetValue: v.targetType === "CHECKBOX" && !periodic ? 1 : v.targetValue,
    targetUnit: v.targetType === "DURATION" ? "min" : v.targetType === "CHECKBOX" ? null : v.targetUnit,
    reminderTime: v.reminderEnabled ? v.reminderTime : null,
    subHabits: v.subHabits.map((s) => ({
      ...s,
      targetValue: s.targetType === "CHECKBOX" ? 1 : s.targetValue,
      targetUnit: s.targetType === "DURATION" ? "min" : s.targetType === "CHECKBOX" ? null : s.targetUnit,
    })),
  };
}
