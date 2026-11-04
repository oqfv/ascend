"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";
import { NativeSelect, Segmented } from "@/components/controls";
import { saveNutritionProfile } from "@/app/(app)/nutrition/actions";
import { ACTIVITY, GOALS, ageIn, suggestTargets, type Activity, type Goal, type Sex } from "@/lib/domain/nutrition";

type Initial = { sex: Sex; birthYear: number; heightCm: number; weightKg: number; activity: Activity; goal: Goal; calorieTarget: number; proteinTarget: number } | null;

/** Body details in, suggested targets out (live), with the option to use your own numbers. */
export function TargetsForm({ initial, year }: { initial: Initial; year: number }) {
  const router = useRouter();
  const [sex, setSex] = useState<Sex>(initial?.sex ?? "male");
  const [birthYear, setBirthYear] = useState(String(initial?.birthYear ?? ""));
  const [height, setHeight] = useState(String(initial?.heightCm ?? ""));
  const [weight, setWeight] = useState(String(initial?.weightKg ?? ""));
  const [activity, setActivity] = useState<Activity>(initial?.activity ?? "light");
  const [goal, setGoal] = useState<Goal>(initial?.goal ?? "keep");
  const [ownCalories, setOwnCalories] = useState("");
  const [ownProtein, setOwnProtein] = useState("");
  const [pending, start] = useTransition();

  const body = { sex, birthYear: Number(birthYear), heightCm: Number(height), weightKg: Number(weight.replace(",", ".")), activity, goal };
  const complete = body.birthYear > 1900 && body.heightCm >= 100 && body.weightKg >= 25;
  const suggestion = useMemo(() => (complete ? suggestTargets(body, year) : null), [complete, sex, birthYear, height, weight, activity, goal, year]); // eslint-disable-line react-hooks/exhaustive-deps
  const under18 = complete && ageIn(body.birthYear, year) < 18;

  function save(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await saveNutritionProfile({ ...body, calorieTarget: ownCalories ? Number(ownCalories) : null, proteinTarget: ownProtein ? Number(ownProtein) : null });
      if (res.ok) { toast.success("Targets saved"); router.push("/nutrition"); }
      else toast.error(res.error);
    });
  }

  return (
    <form onSubmit={save} className="grid gap-6">
      <section className="grid gap-4 rounded-2xl bg-surface p-5">
        <h2 className="text-sm font-medium">About you</h2>
        <Segmented label="Sex" value={sex} onChange={setSex} options={[{ value: "male", label: "Male" }, { value: "female", label: "Female" }]} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Birth year">{(p) => <Input {...p} inputMode="numeric" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} placeholder="2004" className="num" />}</Field>
          <Field label="Height (cm)">{(p) => <Input {...p} inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="175" className="num" />}</Field>
          <Field label="Weight (kg)">{(p) => <Input {...p} inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="70" className="num" />}</Field>
        </div>
        <Field label="How active are you?">
          {(p) => (
            <NativeSelect {...p} value={activity} onChange={(e) => setActivity(e.target.value as Activity)} className="sm:max-w-[420px]">
              {ACTIVITY.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </NativeSelect>
          )}
        </Field>
        <Segmented label="Goal" value={goal} onChange={setGoal} options={GOALS.map((g) => ({ ...g, label: under18 && g.value === "lose" ? "Lose weight (18+ only)" : g.label }))} />
      </section>

      <section className="grid gap-4 rounded-2xl bg-surface p-5">
        <h2 className="text-sm font-medium">Your daily targets</h2>
        {suggestion ? (
          <>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[["Calories", `${suggestion.calories} kcal`], ["Protein", `${suggestion.protein} g`], ["Carbs", `${suggestion.carbs} g`], ["Fat", `${suggestion.fat} g`]].map(([k, v]) => (
                <div key={k}><dt className="text-sm text-muted-foreground">{k}</dt><dd className="num mt-1 text-2xl">{v}</dd></div>
              ))}
            </dl>
            {suggestion.notes.map((n) => <p key={n} className="rounded-lg bg-pill-warning px-3 py-2 text-sm text-pill-warning-ink">{n}</p>)}
          </>
        ) : (
          <p className="text-muted-foreground">Fill in the details above to see your suggested targets.</p>
        )}
        <details className="group">
          <summary className="w-fit cursor-pointer list-none text-sm font-medium underline-offset-4 hover:underline [&::-webkit-details-marker]:hidden">Use my own numbers instead</summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="Calories (kcal)" hint="Leave empty to use the suggestion.">{(p) => <Input {...p} inputMode="numeric" value={ownCalories} onChange={(e) => setOwnCalories(e.target.value)} className="num" />}</Field>
            <Field label="Protein (g)" hint="Leave empty to use the suggestion.">{(p) => <Input {...p} inputMode="numeric" value={ownProtein} onChange={(e) => setOwnProtein(e.target.value)} className="num" />}</Field>
          </div>
        </details>
        <p className="text-sm text-muted-foreground">
          These are estimates for healthy adults, not medical advice. If you&apos;re pregnant, have a health condition or an eating disorder, or are under 18, ask a doctor or dietitian first.
        </p>
      </section>

      <div>
        <Button type="submit" size="lg" disabled={pending || !complete}>{pending ? "Saving…" : "Save targets"}</Button>
      </div>
    </form>
  );
}
