"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";
import { Segmented } from "@/components/controls";
import { saveNutritionProfile, skipNutritionWelcome } from "@/app/(app)/nutrition/actions";
import { ACTIVITY, ageIn, suggestTargets, type Activity, type Goal, type Sex } from "@/lib/domain/nutrition";
import { cn } from "@/lib/utils";

const STEPS = ["Welcome", "About you", "Activity", "Goal", "Your numbers"] as const;

const GOAL_OPTIONS: { value: Goal; label: string; text: string }[] = [
  { value: "lose", label: "Lose weight", text: "About 500 kcal under what you burn, with extra protein to keep muscle." },
  { value: "keep", label: "Stay the same", text: "Eat about what you burn each day." },
  { value: "gain", label: "Gain muscle", text: "About 300 kcal over what you burn, with extra protein." },
];

/** First visit to Nutrition: a short walk from welcome to daily targets, then on to the first meal. */
export function WelcomeFlow({ year, name }: { year: number; name: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [sex, setSex] = useState<Sex>("male");
  const [birthYear, setBirthYear] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [activity, setActivity] = useState<Activity | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [ownCalories, setOwnCalories] = useState("");
  const [ownProtein, setOwnProtein] = useState("");
  const [pending, start] = useTransition();

  const by = Number(birthYear), h = Number(height), w = Number(weight.replace(",", "."));
  const aboutErrors = {
    birthYear: birthYear && !(by >= 1900 && by <= year - 13) ? `Use a year between 1900 and ${year - 13}.` : undefined,
    height: height && !(h >= 100 && h <= 250) ? "Use centimetres, like 175." : undefined,
    weight: weight && !(w >= 25 && w <= 350) ? "Use kilograms, like 70." : undefined,
  };
  const aboutDone = by >= 1900 && by <= year - 13 && h >= 100 && h <= 250 && w >= 25 && w <= 350;
  const under18 = aboutDone && ageIn(by, year) < 18;
  const targets = useMemo(
    () => (aboutDone && activity && goal ? suggestTargets({ sex, birthYear: by, heightCm: h, weightKg: w, activity, goal }, year) : null),
    [aboutDone, activity, goal, sex, by, h, w, year],
  );
  const shown = targets && {
    calories: ownCalories ? Number(ownCalories) : targets.calories,
    protein: ownProtein ? Number(ownProtein) : targets.protein,
  };
  const split = shown && (() => {
    const fat = Math.round((shown.calories * 0.25) / 9);
    const carbs = Math.max(0, Math.round((shown.calories - shown.protein * 4 - fat * 9) / 4));
    const total = shown.protein * 4 + carbs * 4 + fat * 9 || 1;
    return { fat, carbs, pP: (shown.protein * 4) / total, pC: (carbs * 4) / total, pF: (fat * 9) / total };
  })();

  const canNext = step === 1 ? aboutDone : step === 2 ? !!activity : step === 3 ? !!goal : true;
  const next = () => canNext && setStep((s) => Math.min(STEPS.length - 1, s + 1));

  function save() {
    if (!activity || !goal) return;
    start(async () => {
      const res = await saveNutritionProfile({
        sex, birthYear: by, heightCm: h, weightKg: w, activity, goal,
        calorieTarget: ownCalories ? Number(ownCalories) : null,
        proteinTarget: ownProtein ? Number(ownProtein) : null,
      });
      if (res.ok) router.push("/nutrition?welcome=done");
      else toast.error(res.error);
    });
  }

  function skip() {
    start(async () => {
      await skipNutritionWelcome();
      router.push("/nutrition");
    });
  }

  return (
    <div className="mx-auto grid w-full max-w-[560px] gap-8">
      {/* The steps are a real sequence, so the bar shows how far along you are. */}
      <div className="grid gap-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{STEPS[step]}</span>
          <span className="num">{step + 1} of {STEPS.length}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-data-track" role="progressbar" aria-label="Welcome progress" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1}>
          <div className="h-full rounded-full bg-data transition-[width] duration-500 ease-out" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
      </div>

      <div key={step} className="tour-step grid gap-6">
        {step === 0 && (
          <>
            <div className="grid gap-3">
              <h1 className="font-display text-[34px] leading-[1.1] font-semibold tracking-[-0.03em] sm:text-[42px]">Welcome to Nutrition, {name}.</h1>
              <p className="text-lg leading-7 text-muted-foreground">
                First, a minute of questions so Ascend can work out how much you need each day. Then you can start adding meals.
              </p>
            </div>
            <ul className="grid gap-3 text-base leading-6">
              <li className="rounded-xl bg-surface px-4 py-3">Add meals by searching for a food, describing what you ate, or typing it in.</li>
              <li className="rounded-xl bg-surface px-4 py-3">See your calories, protein, carbs and fat for the day, and how much is left.</li>
              <li className="rounded-xl bg-surface px-4 py-3">Your details stay private to your account, like everything else in Ascend.</li>
            </ul>
          </>
        )}

        {step === 1 && (
          <>
            <div className="grid gap-2">
              <h1 className="font-display text-[30px] leading-[1.15] font-semibold tracking-[-0.03em]">A little about you</h1>
              <p className="text-muted-foreground">The calculation uses these four things. You can change them any time.</p>
            </div>
            <Segmented label="Sex" value={sex} onChange={setSex} options={[{ value: "male", label: "Male" }, { value: "female", label: "Female" }]} />
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Birth year" error={aboutErrors.birthYear}>{(p) => <Input {...p} inputMode="numeric" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} placeholder="2004" className="num" autoFocus />}</Field>
              <Field label="Height (cm)" error={aboutErrors.height}>{(p) => <Input {...p} inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="175" className="num" />}</Field>
              <Field label="Weight (kg)" error={aboutErrors.weight}>{(p) => <Input {...p} inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="70" className="num" />}</Field>
            </div>
          </>
        )}

        {step === 2 && (
          <fieldset className="grid gap-3">
            <legend className="mb-4 font-display text-[30px] leading-[1.15] font-semibold tracking-[-0.03em]">How active is a normal week?</legend>
            {ACTIVITY.map((a) => (
              <Choice key={a.value} name="activity" checked={activity === a.value} onChange={() => setActivity(a.value)} label={a.label} />
            ))}
          </fieldset>
        )}

        {step === 3 && (
          <fieldset className="grid gap-3">
            <legend className="mb-4 font-display text-[30px] leading-[1.15] font-semibold tracking-[-0.03em]">What are you working toward?</legend>
            {GOAL_OPTIONS.map((g) => {
              const blocked = under18 && g.value === "lose";
              return (
                <Choice
                  key={g.value}
                  name="goal"
                  checked={goal === g.value}
                  disabled={blocked}
                  onChange={() => setGoal(g.value)}
                  label={g.label}
                  text={blocked ? "Not suggested under 18. Talk to a doctor if you want to lose weight." : g.text}
                />
              );
            })}
          </fieldset>
        )}

        {step === 4 && targets && shown && split && (
          <>
            {/* The one bold moment: the day's number as a sentence, with where it comes from right under it. */}
            <div className="grid gap-5">
              <h1 className="font-display text-[34px] leading-[1.12] font-semibold tracking-[-0.03em] sm:text-[44px]">
                Your day is about <span className="num">{shown.calories.toLocaleString("en-US")}</span> kcal.
              </h1>
              <div>
                <div className="flex h-4 overflow-hidden rounded-full" aria-hidden="true">
                  <div className="bg-data" style={{ width: `${split.pP * 100}%` }} />
                  <div className="bg-[var(--habit-ochre)]" style={{ width: `${split.pC * 100}%` }} />
                  <div className="bg-[var(--habit-slate)]" style={{ width: `${split.pF * 100}%` }} />
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-3">
                  <Macro dot="bg-data" label="Protein" value={shown.protein} />
                  <Macro dot="bg-[var(--habit-ochre)]" label="Carbs" value={split.carbs} />
                  <Macro dot="bg-[var(--habit-slate)]" label="Fat" value={split.fat} />
                </dl>
              </div>
            </div>
            {targets.notes.map((n) => <p key={n} className="rounded-lg bg-pill-warning px-3 py-2 text-sm text-pill-warning-ink">{n}</p>)}
            <details className="rounded-xl bg-surface px-4 py-3">
              <summary className="cursor-pointer text-sm font-medium">Use my own numbers instead</summary>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Field label="Calories (kcal)" hint={`Suggested: ${targets.calories}`}>{(p) => <Input {...p} inputMode="numeric" value={ownCalories} onChange={(e) => setOwnCalories(e.target.value)} className="num" />}</Field>
                <Field label="Protein (g)" hint={`Suggested: ${targets.protein}`}>{(p) => <Input {...p} inputMode="numeric" value={ownProtein} onChange={(e) => setOwnProtein(e.target.value)} className="num" />}</Field>
              </div>
            </details>
            <p className="text-sm text-muted-foreground">
              An estimate for healthy adults, not medical advice. If you&apos;re pregnant, have a health condition or an eating disorder, ask a doctor or dietitian first.
            </p>
          </>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        {step === 0 ? (
          <Button variant="ghost" onClick={skip} disabled={pending}>Skip for now</Button>
        ) : (
          <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={pending}><ChevronLeft /> Back</Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button size="lg" onClick={next} disabled={!canNext}>{step === 0 ? "Work out my numbers" : "Next"}</Button>
        ) : (
          <Button size="lg" onClick={save} disabled={pending}>{pending ? "Saving…" : "Save and add a meal"}</Button>
        )}
      </div>
    </div>
  );
}

function Choice({ name, checked, onChange, label, text, disabled }: { name: string; checked: boolean; onChange: () => void; label: string; text?: string; disabled?: boolean }) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
        checked ? "border-data bg-data-soft" : "border-border bg-background hover:bg-surface",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <input type="radio" name={name} checked={checked} onChange={onChange} disabled={disabled} className="mt-1 size-4 accent-[var(--data)]" />
      <span className="grid gap-0.5">
        <span className="font-medium">{label}</span>
        {text && <span className="text-sm text-muted-foreground">{text}</span>}
      </span>
    </label>
  );
}

function Macro({ dot, label, value }: { dot: string; label: string; value: number }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-sm text-muted-foreground"><span className={cn("size-2 rounded-full", dot)} aria-hidden="true" />{label}</dt>
      <dd className="num mt-0.5 text-xl">{value} g</dd>
    </div>
  );
}
