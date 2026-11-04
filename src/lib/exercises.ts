// The built-in exercise list. Keys are stored on every set, so never rename a key; change the name instead.

export type Exercise = { key: string; name: string; group: ExerciseGroup };

export const EXERCISE_GROUPS = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Other"] as const;
export type ExerciseGroup = (typeof EXERCISE_GROUPS)[number];

export const EXERCISES: Exercise[] = [
  { key: "bench-press", name: "Bench press", group: "Chest" },
  { key: "incline-bench-press", name: "Incline bench press", group: "Chest" },
  { key: "dumbbell-press", name: "Dumbbell press", group: "Chest" },
  { key: "chest-fly", name: "Chest fly", group: "Chest" },
  { key: "push-up", name: "Push-up", group: "Chest" },
  { key: "deadlift", name: "Deadlift", group: "Back" },
  { key: "pull-up", name: "Pull-up", group: "Back" },
  { key: "lat-pulldown", name: "Lat pulldown", group: "Back" },
  { key: "barbell-row", name: "Barbell row", group: "Back" },
  { key: "seated-row", name: "Seated cable row", group: "Back" },
  { key: "squat", name: "Squat", group: "Legs" },
  { key: "leg-press", name: "Leg press", group: "Legs" },
  { key: "romanian-deadlift", name: "Romanian deadlift", group: "Legs" },
  { key: "lunge", name: "Lunge", group: "Legs" },
  { key: "leg-extension", name: "Leg extension", group: "Legs" },
  { key: "leg-curl", name: "Leg curl", group: "Legs" },
  { key: "calf-raise", name: "Calf raise", group: "Legs" },
  { key: "overhead-press", name: "Overhead press", group: "Shoulders" },
  { key: "lateral-raise", name: "Lateral raise", group: "Shoulders" },
  { key: "rear-delt-fly", name: "Rear delt fly", group: "Shoulders" },
  { key: "bicep-curl", name: "Bicep curl", group: "Arms" },
  { key: "hammer-curl", name: "Hammer curl", group: "Arms" },
  { key: "tricep-pushdown", name: "Tricep pushdown", group: "Arms" },
  { key: "dip", name: "Dip", group: "Arms" },
  { key: "plank", name: "Plank (reps = seconds)", group: "Core" },
  { key: "crunch", name: "Crunch", group: "Core" },
  { key: "hanging-leg-raise", name: "Hanging leg raise", group: "Core" },
];

const BY_KEY = new Map(EXERCISES.map((e) => [e.key, e]));

export const builtInExercise = (key: string) => BY_KEY.get(key) ?? null;

/** Custom exercises are stored as "custom:<id>". */
export const customKey = (id: string) => `custom:${id}`;
export const customIdOf = (key: string) => (key.startsWith("custom:") ? key.slice(7) : null);
