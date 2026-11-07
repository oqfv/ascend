import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { share } from "@/lib/domain/nutrition";

type Figure = { label: string; value: string; of: string | null; progress: number | null; color: string };

/** A one-line look at the day's eating and drinking, linking through to Nutrition. */
export function NutritionSummary({
  href,
  calories,
  calorieTarget,
  protein,
  proteinTarget,
  waterMl,
  waterTargetMl,
}: {
  href: string;
  calories: number;
  calorieTarget: number | null;
  protein: number;
  proteinTarget: number | null;
  waterMl: number;
  waterTargetMl: number;
}) {
  const figures: Figure[] = [
    { label: "Calories", value: Math.round(calories).toLocaleString("en-US"), of: calorieTarget ? `${calorieTarget.toLocaleString("en-US")} kcal` : "kcal", progress: share(calories, calorieTarget), color: "bg-data" },
    { label: "Protein", value: String(Math.round(protein)), of: proteinTarget ? `${proteinTarget} g` : "g", progress: share(protein, proteinTarget), color: "bg-data" },
    { label: "Water", value: (waterMl / 1000).toFixed(2).replace(/0$/, ""), of: `${(waterTargetMl / 1000).toFixed(2).replace(/0$/, "")} L`, progress: share(waterMl, waterTargetMl), color: "bg-[var(--habit-sky)]" },
  ];
  return (
    <Link href={href} aria-label="Open Nutrition" className="group mt-6 block rounded-2xl bg-surface p-4 transition-colors hover:bg-surface-strong sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-medium">Nutrition</h2>
        <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-3 sm:gap-6">
        {figures.map((f) => (
          <div key={f.label} className="min-w-0">
            <dt className="text-sm text-muted-foreground">{f.label}</dt>
            <dd className="num mt-0.5">
              <span className="text-lg">{f.value}</span>
              <span className="block text-sm text-muted-foreground sm:inline">{f.of && (f.of.startsWith("kcal") || f.of === "g" ? ` ${f.of}` : ` / ${f.of}`)}</span>
            </dd>
            {f.progress !== null && (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-data-track" aria-hidden="true">
                <div className={`h-full rounded-full ${f.color}`} style={{ width: `${f.progress * 100}%` }} />
              </div>
            )}
          </div>
        ))}
      </dl>
    </Link>
  );
}
