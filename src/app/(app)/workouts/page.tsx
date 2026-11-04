import type { Metadata } from "next";
import Link from "next/link";
import { Page } from "@/components/page-header";
import { DateNav } from "@/components/date-nav";
import { StatusPill } from "@/components/status-pill";
import { SetForm } from "@/components/workouts/set-form";
import { DeleteSetButton } from "@/components/workouts/delete-set-button";
import { ExerciseIcon } from "@/components/workouts/exercise-icon";
import { loadExerciseOptions, loadRecentWorkouts, loadSetHistory, loadWorkoutDay } from "@/lib/data/workouts";
import { isISODate } from "@/lib/domain/dates";
import { isPersonalBest } from "@/lib/domain/workouts";
import { formatDay, plural } from "@/lib/format";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Workouts" };

const kg = (v: number) => (v === 0 ? "bodyweight" : `${Number(v.toFixed(2))} kg`);

export default async function WorkoutsPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const user = await requireUser();
  const { date: raw } = await searchParams;
  const date = raw && isISODate(raw) && raw <= user.today ? raw : user.today;
  const [sets, options, recent] = await Promise.all([loadWorkoutDay(user.id, date), loadExerciseOptions(user.id), loadRecentWorkouts(user.id)]);
  const history = sets.length ? await loadSetHistory(user.id, [...new Set(sets.map((s) => s.exercise))]) : [];

  // Group the day's sets by exercise, in the order they were first logged.
  const groups: { exercise: string; name: string; sets: typeof sets }[] = [];
  for (const s of sets) {
    const g = groups.find((x) => x.exercise === s.exercise);
    if (g) g.sets.push(s);
    else groups.push({ exercise: s.exercise, name: s.exerciseName, sets: [s] });
  }
  const volume = sets.reduce((a, s) => a + s.weightKg * s.reps, 0);
  const groupOf = (key: string) => options.find((o) => o.key === key)?.group ?? "Other";

  return (
    <Page>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-[-0.01em]">Workouts</h1>
          <p className="mt-1 text-muted-foreground">
            {date === user.today ? "Today" : formatDay(date, "long")}.{" "}
            {sets.length ? `${plural(sets.length, "set")} across ${plural(groups.length, "exercise")}, ${Math.round(volume).toLocaleString("en-US")} kg moved.` : "No sets logged yet."}
          </p>
        </div>
        <DateNav date={date} today={user.today} basePath="/workouts" />
      </div>

      <section aria-label="Log a set" className="mt-6 rounded-2xl bg-surface p-5">
        <h2 className="mb-4 text-sm font-medium">Log a set</h2>
        <SetForm date={date} options={options} />
      </section>

      {groups.length > 0 && (
        <section aria-label="Sets" className="mt-4 grid gap-3">
          {groups.map((g) => (
            <div key={g.exercise} className="rounded-2xl bg-surface p-2 sm:p-3">
              <div className="flex items-center justify-between gap-3 px-3 pt-2 pb-2">
                <div className="flex min-w-0 items-center gap-3">
                  <ExerciseIcon group={groupOf(g.exercise)} size="sm" />
                  <h3 className="font-medium">{g.name}</h3>
                </div>
                <Link href={`/workouts/${encodeURIComponent(g.exercise)}`} className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                  Progress
                </Link>
              </div>
              <ol className="grid gap-1">
                {g.sets.map((s, i) => {
                  const row = { date, exercise: s.exercise, reps: s.reps, weightKg: s.weightKg };
                  const record = isPersonalBest(row, history);
                  return (
                    <li key={s.id} className="flex items-center gap-3 rounded-xl bg-background px-3 py-2">
                      <span className="num w-12 text-sm text-muted-foreground">Set {i + 1}</span>
                      <span className="num flex-1">
                        {s.reps} reps × {kg(s.weightKg)}
                      </span>
                      {record && <StatusPill tone="positive">New best</StatusPill>}
                      <DeleteSetButton id={s.id} label={`set ${i + 1} of ${g.name}`} />
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </section>
      )}

      {recent.length > 0 && (
        <section aria-labelledby="recent-title" className="mt-4 rounded-2xl bg-surface p-5">
          <h2 id="recent-title" className="text-sm font-medium">
            Recent workouts
          </h2>
          <ul className="mt-3 grid gap-1">
            {recent.map((r) => (
              <li key={r.date}>
                <Link href={r.date === user.today ? "/workouts" : `/workouts?date=${r.date}`} className="flex flex-wrap items-baseline justify-between gap-x-4 rounded-xl bg-background px-3 py-2 hover:bg-accent">
                  <span className="font-medium">{formatDay(r.date)}</span>
                  <span className="text-sm text-muted-foreground">
                    {plural(r.sets, "set")}: {r.exercises.slice(0, 3).join(", ")}
                    {r.exercises.length > 3 ? ` and ${r.exercises.length - 3} more` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Page>
  );
}
