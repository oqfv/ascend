// Test fixtures only. Never imported by application code.

import type { HabitDef, ScheduleVersion, SubHabitDef } from "./schedule";

export function version(over: Partial<ScheduleVersion> = {}): ScheduleVersion {
  return {
    effectiveFrom: "2026-01-01",
    frequency: "DAILY",
    weekdays: [],
    intervalDays: null,
    timesPerDay: 1,
    targetType: "CHECKBOX",
    targetValue: 1,
    targetUnit: null,
    paused: false,
    requireSubHabits: true,
    ...over,
  };
}

export function sub(over: Partial<SubHabitDef> & { id: string }): SubHabitDef {
  return {
    name: over.id,
    targetType: "CHECKBOX",
    targetValue: 1,
    targetUnit: null,
    required: true,
    sortOrder: 0,
    activeFrom: "2026-01-01",
    archivedOn: null,
    ...over,
  };
}

export function habit(over: Partial<HabitDef> = {}): HabitDef {
  return {
    id: "h1",
    name: "Read",
    categoryId: null,
    startDate: "2026-01-01",
    endDate: null,
    archivedOn: null,
    schedules: [version()],
    subHabits: [],
    ...over,
  };
}
