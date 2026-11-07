import Link from "next/link";
import { ChartFrame, DataTable } from "@/components/charts/chart-frame";
import { ColumnChart, type Column } from "@/components/charts/column-chart";
import { WeightChart } from "@/components/charts/weight-chart";
import type { NutritionDay, NutritionSummary } from "@/lib/domain/nutrition";
import { formatDay, formatRange, plural } from "@/lib/format";

const kcal = (v: number) => `${v.toLocaleString("en-US")} kcal`;
const litres = (ml: number) => `${(ml / 1000).toFixed(2).replace(/0$/, "")} L`;

/** Long periods are shown a week per column (average of the logged days), short ones a day per column. */
function columns(days: NutritionDay[], target: number | null): Column[] {
  const targetLine = target ? [{ label: "Target", value: kcal(target) }] : [];
  if (days.length <= 62) {
    return days.map((d) => ({
      x: formatDay(d.date, "short"),
      title: formatDay(d.date, "medium"),
      value: d.logged ? d.calories : null,
      lines: d.logged ? [{ label: "Calories", value: kcal(d.calories) }, { label: "Protein", value: `${d.protein} g` }, ...targetLine] : [{ label: "Nothing logged", value: "" }],
    }));
  }
  const out: Column[] = [];
  for (let i = 0; i < days.length; i += 7) {
    const week = days.slice(i, i + 7);
    const logged = week.filter((d) => d.logged);
    const avg = logged.length ? Math.round(logged.reduce((a, d) => a + d.calories, 0) / logged.length) : null;
    out.push({
      x: formatDay(week[0].date, "short"),
      title: `Week of ${formatRange(week[0].date, week[week.length - 1].date)}`,
      value: avg,
      lines: avg === null ? [{ label: "Nothing logged", value: "" }] : [{ label: "Average", value: kcal(avg) }, { label: "Days logged", value: String(logged.length) }, ...targetLine],
    });
  }
  return out;
}

/** The period's eating, water and weight, under the habit analytics. */
export function NutritionSection({ s, calorieTarget, proteinTarget }: { s: NutritionSummary; calorieTarget: number | null; proteinTarget: number | null }) {
  const change = s.weightFirst && s.weightLast ? Math.round((s.weightLast.kg - s.weightFirst.kg) * 10) / 10 : null;
  const facts = [
    { label: "Days logged", value: String(s.loggedDays), sub: `of ${plural(s.days.length, "day")}` },
    { label: "Average calories", value: s.avgCalories === null ? "–" : s.avgCalories.toLocaleString("en-US"), sub: calorieTarget ? `target ${kcal(calorieTarget)}` : "kcal a day" },
    { label: "Average protein", value: s.avgProtein === null ? "–" : `${s.avgProtein} g`, sub: proteinTarget ? `target ${proteinTarget} g` : "a day" },
    { label: "Days on target", value: s.onTargetDays === null ? "–" : String(s.onTargetDays), sub: s.onTargetDays === null ? "Set targets first" : `of ${plural(s.loggedDays, "logged day")}` },
    { label: "Water goal reached", value: String(s.waterGoalDays), sub: s.avgWaterMl ? `average ${litres(s.avgWaterMl)}` : "No water logged" },
    {
      label: "Weight",
      value: s.weightLast ? `${s.weightLast.kg} kg` : s.weightFirst ? `${s.weightFirst.kg} kg` : "–",
      sub: change === null ? (s.weightFirst ? "One weigh-in" : "No weigh-ins") : `${change > 0 ? "+" : change < 0 ? "−" : "±"}${Math.abs(change)} kg since ${formatDay(s.weightFirst!.date, "short")}`,
    },
  ];
  const cols = columns(s.days, calorieTarget);

  return (
    <section aria-labelledby="nutrition-analytics" className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="nutrition-analytics" className="text-xl font-semibold tracking-[-0.01em]">Nutrition</h2>
          <p className="mt-1 text-sm text-muted-foreground">Averages count only days with food logged. &ldquo;On target&rdquo; means calories within 10% of your current target and protein reached.</p>
        </div>
        <Link href="/nutrition" className="text-sm font-medium underline-offset-4 hover:underline">Open Nutrition</Link>
      </div>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
        <section aria-label="Nutrition totals" className="rounded-2xl bg-surface p-5 lg:col-span-12">
          <dl className="grid grid-cols-2 gap-y-5 sm:grid-cols-3 lg:grid-cols-6 lg:divide-x lg:divide-border">
            {facts.map((f) => (
              <div key={f.label} className="lg:px-5 lg:first:pl-0">
                <dt className="text-sm text-muted-foreground">{f.label}</dt>
                <dd className="num mt-1 text-2xl">{f.value}</dd>
                <dd className="mt-1 text-xs text-muted-foreground">{f.sub}</dd>
              </div>
            ))}
          </dl>
        </section>

        <ChartFrame
          className={s.weights.length >= 2 ? "lg:col-span-7" : "lg:col-span-12"}
          title={s.days.length > 62 ? "Calories, weekly average" : "Calories each day"}
          summary="Gaps mean nothing was logged that day. Hover for protein and your target."
          table={<DataTable head={["Day", "Calories", "Protein", "Water"]} rows={s.days.filter((d) => d.logged || d.waterMl > 0).map((d) => [formatDay(d.date, "medium"), d.logged ? d.calories : "–", d.logged ? `${d.protein} g` : "–", d.waterMl ? litres(d.waterMl) : "–"])} />}
        >
          <ColumnChart unit="count" height={220} data={cols} />
        </ChartFrame>

        {s.weights.length >= 2 && (
          <ChartFrame
            className="lg:col-span-5"
            title="Body weight"
            summary={`${plural(s.weights.length, "weigh-in")} in this period.`}
            table={<DataTable head={["Day", "Weight"]} rows={s.weights.map((w) => [formatDay(w.date, "medium"), `${w.kg} kg`])} />}
          >
            <WeightChart data={s.weights} height={220} />
          </ChartFrame>
        )}
      </div>
    </section>
  );
}
