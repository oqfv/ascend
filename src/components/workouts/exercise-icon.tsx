import { Activity, ArrowUpFromLine, BicepsFlexed, Dumbbell, Footprints, Target, Weight } from "lucide-react";
import { cn } from "@/lib/utils";

// One icon per muscle group, so every exercise (built-in or the user's own) has a picture.
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Chest: Dumbbell,
  Back: Weight,
  Legs: Footprints,
  Shoulders: ArrowUpFromLine,
  Arms: BicepsFlexed,
  Core: Target,
  Other: Activity,
};

export function ExerciseIcon({ group, size = "md", className }: { group: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const Icon = ICONS[group] ?? Activity;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-data-soft text-data",
        size === "sm" ? "size-8" : size === "lg" ? "size-14" : "size-10",
        className,
      )}
    >
      <Icon className={size === "sm" ? "size-4" : size === "lg" ? "size-7" : "size-5"} />
    </span>
  );
}
