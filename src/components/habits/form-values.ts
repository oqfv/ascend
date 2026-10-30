import type { HabitInput } from "@/lib/validation/habit";

// Shared by the server pages that build initial values and the client form that edits them.

export interface HabitFormValues extends Omit<HabitInput, "categoryId" | "newCategory"> {
  category: string; // "" | category id | "__new"
  newCategory: string;
  durationUnit: "min" | "h";
}

export function defaultHabitValues(today: string): HabitFormValues {
  return {
    name: "",
    description: null,
    category: "",
    newCategory: "",
    icon: null,
    color: "teal",
    startDate: today,
    endDate: null,
    frequency: "DAILY",
    weekdays: [1, 2, 3, 4, 5],
    intervalDays: 2,
    timesPerDay: 1,
    targetType: "CHECKBOX",
    targetValue: 1,
    targetUnit: null,
    durationUnit: "min",
    requireSubHabits: true,
    reminderEnabled: false,
    reminderTime: null,
    subHabits: [],
  };
}
