import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Page, PageHeader } from "@/components/page-header";
import { HabitForm } from "@/components/habits/habit-form";
import type { HabitFormValues } from "@/components/habits/form-values";
import { loadCategories, loadHabit } from "@/lib/data/habits";
import { maxDate } from "@/lib/domain/dates";
import { subHabitsOn, versionOn } from "@/lib/domain/schedule";
import type { HabitColor, HabitIcon } from "@/lib/constants";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Edit habit" };

export default async function EditHabitPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const [habit, categories] = await Promise.all([loadHabit(user.id, id), loadCategories(user.id)]);
  if (!habit) notFound();

  // The form edits what applies from today on (or from the start, if the habit hasn't begun).
  const asOf = maxDate(user.today, habit.startDate);
  const v = versionOn(habit, asOf) ?? habit.schedules[habit.schedules.length - 1];
  const hours = v.targetType === "DURATION" && v.targetValue >= 60 && v.targetValue % 60 === 0;
  const initial: HabitFormValues = {
    name: habit.name,
    description: habit.description,
    category: habit.categoryId ?? "",
    newCategory: "",
    icon: habit.icon as HabitIcon | null,
    color: habit.color as HabitColor | null,
    startDate: habit.startDate,
    endDate: habit.endDate,
    frequency: v.frequency,
    weekdays: v.frequency === "WEEKDAYS" ? v.weekdays : [1, 2, 3, 4, 5],
    intervalDays: v.intervalDays ?? 2,
    timesPerDay: v.timesPerDay,
    targetType: v.targetType,
    targetValue: hours ? v.targetValue / 60 : v.targetValue,
    targetUnit: v.targetUnit,
    durationUnit: hours ? "h" : "min",
    requireSubHabits: v.requireSubHabits,
    reminderEnabled: habit.reminderEnabled,
    reminderTime: habit.reminderTime,
    subHabits: subHabitsOn(habit, asOf).map((s) => ({
      id: s.id,
      name: s.name,
      targetType: s.targetType,
      targetValue: s.targetValue,
      targetUnit: s.targetUnit,
      required: s.required,
    })),
  };

  return (
    <Page className="max-w-[960px]">
      <PageHeader
        title={`Edit ${habit.name}`}
        description="Changes to the schedule, target or steps apply from today. Earlier days keep the rules they were tracked under."
      />
      <HabitForm mode="edit" habitId={habit.id} initial={initial} categories={categories} />
    </Page>
  );
}
