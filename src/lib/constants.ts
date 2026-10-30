export const DEFAULT_CATEGORIES = [
  "Fitness",
  "Health",
  "Education",
  "Productivity",
  "Personal development",
  "Reading",
  "Finance",
  "Sleep",
  "Other",
] as const;

/** Habit colour keys. Values live in globals.css as --habit-<key>, tuned for both themes. */
export const HABIT_COLORS = ["teal", "ink", "moss", "clay", "slate", "rose", "ochre", "sky"] as const;
export type HabitColor = (typeof HABIT_COLORS)[number];

/** Lucide icon names a habit may use. Kept small so the set stays coherent. */
export const HABIT_ICONS = [
  "book-open",
  "dumbbell",
  "footprints",
  "droplet",
  "moon",
  "brain",
  "pencil",
  "graduation-cap",
  "heart-pulse",
  "apple",
  "piggy-bank",
  "code",
  "music",
  "sun",
  "bike",
  "leaf",
] as const;
export type HabitIcon = (typeof HABIT_ICONS)[number];

export const UNIT_SUGGESTIONS = {
  DURATION: ["min"],
  COUNT: ["pages", "questions", "reps", "sessions", "steps"],
  QUANTITY: ["L", "km", "kg", "ml", "mi"],
} as const;
