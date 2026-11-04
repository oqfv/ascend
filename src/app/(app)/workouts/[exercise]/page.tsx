import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Page, PageHeader } from "@/components/page-header";
import { LinkButton } from "@/components/link-button";
import { ChartFrame } from "@/components/charts/chart-frame";
import { ExerciseChart } from "@/components/workouts/exercise-chart";
import { ExerciseIcon } from "@/components/workouts/exercise-icon";
import { exerciseName, loadExerciseOptions, loadSetHistory } from "@/lib/data/workouts";
import { personalBests, sessionsOf } from "@/lib/domain/workouts";
import { formatDay, plural } from "@/lib/format";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Exercise progress" };

const kg = (v: number) => `${Number(v.toFixed(2))} kg`;

export default async function ExercisePage({ params }: { params: Promise<{ exercise: string }> }) {
  const user = await requireUser();
  const key = decodeURIComponent((await params).exercise);
  // Only built-in exercises and this user's own resolve; anything else is a 404.
  const name = await exerciseName(user.id, key);
  if (!name) notFound();

  const [sets, options] = await Promise.all([loadSetHistory(user.id, [key]), loadExerciseOptions(user.id)]);
  const group = options.find((o) => o.key === key)?.group ?? "Other";
  const sessions = sessionsOf(sets);
  const pb = personalBests(sets);
  const bodyweight = sets.length > 0 && pb.heaviestKg === 0;

  return (
    <Page>
      <LinkButton variant="ghost" href="/workouts" className="-ml-3 mb-2">
        <ChevronLeft /> Workouts
      </LinkButton>
      <PageHeader title={<span className="flex items-center gap-3"><ExerciseIcon group={group} size="lg" />{name}</span>} description={sets.length ? `${plural(pb.sessions, "session")} logged.` : "No sets logged yet. Add one from Workouts."} />

      {sets.length > 0 && (
        <>
          <section aria-label="Personal bests" className="mt-6 rounded-2xl bg-surface p-5">
            <dl className="grid grid-cols-2 gap-y-5 sm:grid-cols-4 sm:divide-x sm:divide-border">
              {!bodyweight && <Stat label="Heaviest" value={kg(pb.heaviestKg)} sub={pb.heaviestOn ? formatDay(pb.heaviestOn) : undefined} />}
              <Stat label="Most reps in a set" value={`${pb.mostReps}`} />
              {!bodyweight && <Stat label="Estimated one-rep max" value={kg(pb.bestEstimatedMax)} sub="From your best set" />}
              <Stat label="Sessions" value={`${pb.sessions}`} />
            </dl>
          </section>

          <ChartFrame
            className="mt-4"
            title={bodyweight ? "Most reps per session" : "Top weight per session"}
            summary="Each point is your best set that day."
            table={
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="px-3 py-2 font-normal">Day</th>
                    <th className="px-3 py-2 font-normal">Sets</th>
                    <th className="px-3 py-2 font-normal">{bodyweight ? "Most reps" : "Top weight"}</th>
                    <th className="px-3 py-2 font-normal">Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {[...sessions].reverse().map((s) => (
                    <tr key={s.date} className="border-t border-rule">
                      <td className="px-3 py-2">{formatDay(s.date)}</td>
                      <td className="num px-3 py-2">{s.sets}</td>
                      <td className="num px-3 py-2">{bodyweight ? s.topReps : kg(s.topWeightKg)}</td>
                      <td className="num px-3 py-2">{Math.round(s.volumeKg).toLocaleString("en-US")} kg</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
          >
            {sessions.length > 1 ? (
              <ExerciseChart sessions={sessions} measure={bodyweight ? "reps" : "weight"} />
            ) : (
              <p className="text-muted-foreground">Log this exercise on another day to see your progress line.</p>
            )}
          </ChartFrame>
        </>
      )}
    </Page>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="sm:px-5 sm:first:pl-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="num mt-1 text-2xl">{value}</dd>
      {sub && <dd className="mt-1 text-xs text-muted-foreground">{sub}</dd>}
    </div>
  );
}
