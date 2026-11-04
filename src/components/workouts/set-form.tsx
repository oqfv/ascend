"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";
import { NativeSelect } from "@/components/controls";
import { addCustomExercise, addSet } from "@/app/(app)/workouts/actions";
import type { ExerciseOption } from "@/lib/data/workouts";
import { EXERCISE_GROUPS } from "@/lib/exercises";
import { ExerciseIcon } from "./exercise-icon";
import type { ISODate } from "@/lib/domain/dates";

const NEW = "__new__";

/** Log one set: pick an exercise (or add your own), reps and weight. Remembers the last exercise for quick repeats. */
export function SetForm({ date, options }: { date: ISODate; options: ExerciseOption[] }) {
  const [exercise, setExercise] = useState(options[0]?.key ?? "");
  const [reps, setReps] = useState("10");
  const [weight, setWeight] = useState("20");
  const [newName, setNewName] = useState("");
  const [newGroup, setNewGroup] = useState<string>("Other");
  const [pending, start] = useTransition();
  const groups = [...new Set(options.map((o) => o.group))];
  const chosen = options.find((o) => o.key === exercise);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await addSet({ date, exercise, reps: Number(reps), weightKg: Number(weight.replace(",", ".")) });
      if (res.ok) toast.success("Set added");
      else toast.error(res.error);
    });
  }

  function createExercise(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await addCustomExercise({ name: newName, group: newGroup });
      if (res.ok) {
        setExercise(res.key);
        setNewName("");
        toast.success("Exercise added");
      } else toast.error(res.error);
    });
  }

  return (
    <div className="grid gap-4">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_110px_130px_auto] sm:items-end">
        <Field label="Exercise">
          {(p) => (
            <div className="flex items-center gap-3">
            <ExerciseIcon group={chosen?.group ?? (exercise === NEW ? newGroup : "Other")} />
            <NativeSelect {...p} className="min-w-0 flex-1" value={exercise} onChange={(e) => setExercise(e.target.value)}>
              {groups.map((g) => (
                <optgroup key={g} label={g}>
                  {options
                    .filter((o) => o.group === g)
                    .map((o) => (
                      <option key={o.key} value={o.key}>
                        {o.name}
                      </option>
                    ))}
                </optgroup>
              ))}
              <option value={NEW}>Add your own exercise…</option>
            </NativeSelect>
            </div>
          )}
        </Field>
        {exercise !== NEW && (
          <>
            <Field label="Reps">{(p) => <Input {...p} inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} className="num" />}</Field>
            <Field label="Weight (kg)">
              {(p) => <Input {...p} inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} className="num" />}
            </Field>
            <Button type="submit" disabled={pending}>
              <Plus /> {pending ? "Adding…" : "Add set"}
            </Button>
          </>
        )}
      </form>
      {exercise !== NEW && <p className="-mt-1 text-sm text-muted-foreground">Use 0 kg for bodyweight exercises like push-ups.</p>}
      {exercise === NEW && (
        <form onSubmit={createExercise} className="grid gap-4 rounded-xl bg-background p-4 sm:grid-cols-[minmax(0,1fr)_180px_auto] sm:items-end">
          <Field label="Exercise name">{(p) => <Input {...p} value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={60} autoFocus />}</Field>
          <Field label="Muscle group">
            {(p) => (
              <NativeSelect {...p} value={newGroup} onChange={(e) => setNewGroup(e.target.value)}>
                {EXERCISE_GROUPS.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </NativeSelect>
            )}
          </Field>
          <Button type="submit" disabled={pending || !newName.trim()}>
            {pending ? "Saving…" : "Save exercise"}
          </Button>
        </form>
      )}
    </div>
  );
}
