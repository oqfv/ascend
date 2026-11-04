import type { Metadata } from "next";
import Link from "next/link";
import { Coffee, Cookie, Moon, Sun } from "lucide-react";
import { Page } from "@/components/page-header";
import { DateNav } from "@/components/date-nav";
import { LinkButton } from "@/components/link-button";
import { AddFood } from "@/components/nutrition/add-food";
import { DeleteFoodButton } from "@/components/nutrition/delete-food-button";
import { loadFoodDay, loadNutritionProfile, loadRecentFoods } from "@/lib/data/nutrition";
import { isISODate } from "@/lib/domain/dates";
import { share, sumMacros } from "@/lib/domain/nutrition";
import { formatDay } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Nutrition" };

const MEALS = [
  { value: "BREAKFAST", label: "Breakfast", icon: Coffee },
  { value: "LUNCH", label: "Lunch", icon: Sun },
  { value: "DINNER", label: "Dinner", icon: Moon },
  { value: "SNACK", label: "Snacks", icon: Cookie },
] as const;

const g = (v: number) => `${Math.round(v)} g`;

export default async function NutritionPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const user = await requireUser();
  const { date: raw } = await searchParams;
  const date = raw && isISODate(raw) && raw <= user.today ? raw : user.today;
  const [profile, entries, recent] = await Promise.all([loadNutritionProfile(user.id), loadFoodDay(user.id, date), loadRecentFoods(user.id)]);
  const total = sumMacros(entries);
  const bars = [
    { label: "Calories", value: total.calories, target: profile?.calorieTarget, unit: "kcal", big: true },
    { label: "Protein", value: total.protein, target: profile?.proteinTarget, unit: "g" },
    { label: "Carbs", value: total.carbs, target: profile?.carbsTarget, unit: "g" },
    { label: "Fat", value: total.fat, target: profile?.fatTarget, unit: "g" },
  ];

  return (
    <Page>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-[-0.01em]">Nutrition</h1>
          <p className="mt-1 text-muted-foreground">
            {date === user.today ? "Today" : formatDay(date, "long")}.{" "}
            {profile
              ? `${Math.max(0, Math.round(profile.calorieTarget - total.calories)).toLocaleString("en-US")} kcal and ${Math.max(0, Math.round(profile.proteinTarget - total.protein))} g protein left.`
              : `${Math.round(total.calories).toLocaleString("en-US")} kcal so far.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LinkButton variant="outline" href="/nutrition/targets">{profile ? "Targets" : "Set targets"}</LinkButton>
          <DateNav date={date} today={user.today} basePath="/nutrition" />
        </div>
      </div>

      {!profile && (
        <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-data-soft px-4 py-3">
          <span>Set your daily calorie and protein targets to see what&apos;s left each day.</span>
          <Link href="/nutrition/targets" className="font-medium underline underline-offset-4">Set targets</Link>
        </p>
      )}

      <section aria-label="Day totals" className="mt-6 grid gap-4 rounded-2xl bg-surface p-5 sm:grid-cols-3">
        {bars.map((b) => {
          const s = share(b.value, b.target);
          return (
            <div key={b.label} className={cn(b.big && "sm:col-span-3")}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm text-muted-foreground">{b.label}</span>
                <span className={cn("num", b.big ? "text-2xl" : "text-base")}>
                  {Math.round(b.value).toLocaleString("en-US")}
                  <span className="text-sm text-muted-foreground"> {b.target ? `/ ${b.target.toLocaleString("en-US")} ` : ""}{b.unit}</span>
                </span>
              </div>
              {s !== null && (
                <div className={cn("mt-2 overflow-hidden rounded-full bg-data-track", b.big ? "h-3" : "h-2")} aria-hidden="true">
                  <div className="h-full rounded-full bg-data" style={{ width: `${s * 100}%` }} />
                </div>
              )}
            </div>
          );
        })}
      </section>

      <div className="mt-4 grid gap-3">
        {MEALS.map((m) => {
          const items = entries.filter((e) => e.meal === m.value);
          const sum = sumMacros(items);
          const Icon = m.icon;
          return (
            <section key={m.value} aria-labelledby={`meal-${m.value}`} className="grid gap-2 rounded-2xl bg-surface p-2 sm:p-3">
              <div className="flex items-center justify-between gap-3 px-3 pt-2">
                <h2 id={`meal-${m.value}`} className="flex items-center gap-2 font-medium">
                  <Icon className="size-4 text-muted-foreground" aria-hidden="true" /> {m.label}
                </h2>
                {items.length > 0 && <span className="num text-sm text-muted-foreground">{Math.round(sum.calories)} kcal</span>}
              </div>
              {items.length > 0 && (
                <ul className="grid gap-1">
                  {items.map((e) => (
                    <li key={e.id} className="flex items-center gap-3 rounded-xl bg-background px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate">
                          {e.name}
                          {e.brand && <span className="text-muted-foreground"> · {e.brand}</span>}
                        </p>
                        <p className="num text-sm text-muted-foreground">
                          {e.grams ? `${Math.round(e.grams)} g · ` : ""}P {g(e.protein)} · C {g(e.carbs)} · F {g(e.fat)}
                        </p>
                      </div>
                      <span className="num">{Math.round(e.calories)} kcal</span>
                      <DeleteFoodButton id={e.id} label={e.name} />
                    </li>
                  ))}
                </ul>
              )}
              <div className="grid px-1 pb-1">
                <AddFood date={date} meal={m.value} mealLabel={m.label} recent={recent} />
              </div>
            </section>
          );
        })}
      </div>
    </Page>
  );
}
