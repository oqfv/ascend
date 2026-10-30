"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/field";
import { NativeSelect, Segmented } from "@/components/controls";
import { ICONS } from "@/components/habit-icon";
import { HABIT_COLORS, HABIT_ICONS } from "@/lib/constants";
import { createHabit, updateHabit } from "@/app/(app)/habits/actions";
import { habitInput, type HabitInput } from "@/lib/validation/habit";
import type { HabitFormValues } from "./form-values";
import { formatAmount, formatDay } from "@/lib/format";
import { cn } from "@/lib/utils";

type TargetType = HabitInput["targetType"];
type Frequency = HabitInput["frequency"];


const WEEKDAYS = [
  { n: 1, short: "Mon" },
  { n: 2, short: "Tue" },
  { n: 3, short: "Wed" },
  { n: 4, short: "Thu" },
  { n: 5, short: "Fri" },
  { n: 6, short: "Sat" },
  { n: 0, short: "Sun" },
];

const MEASURES: { value: TargetType; label: string }[] = [
  { value: "CHECKBOX", label: "Check off" },
  { value: "DURATION", label: "Time" },
  { value: "COUNT", label: "Count" },
  { value: "QUANTITY", label: "Amount" },
];

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: "DAILY", label: "Every day" },
  { value: "WEEKDAYS", label: "On certain days" },
  { value: "INTERVAL", label: "Every few days" },
  { value: "WEEKLY", label: "A number of times a week" },
  { value: "MONTHLY", label: "A number of times a month" },
];


/** One readable sentence of what the form currently describes. */
function describe(v: HabitFormValues): string {
  const name = v.name.trim() || "This habit";
  const periodic = v.frequency === "WEEKLY" || v.frequency === "MONTHLY";
  const minutes = v.targetType === "DURATION" ? toMinutes(v.targetValue, v.durationUnit) : v.targetValue;
  const amount =
    v.targetType === "CHECKBOX"
      ? periodic
        ? `${v.targetValue} ${v.targetValue === 1 ? "time" : "times"}`
        : ""
      : formatAmount(minutes || 0, v.targetType, v.targetUnit);
  const when =
    v.frequency === "DAILY"
      ? "every day"
      : v.frequency === "WEEKDAYS"
        ? `on ${WEEKDAYS.filter((d) => v.weekdays.includes(d.n)).map((d) => d.short).join(", ") || "no days yet"}`
        : v.frequency === "INTERVAL"
          ? `every ${v.intervalDays ?? "?"} days`
          : v.frequency === "WEEKLY"
            ? "a week"
            : "a month";
  const times = !periodic && v.timesPerDay > 1 ? `, ${v.timesPerDay} times a day` : "";
  const steps = v.subHabits.length ? ` It has ${v.subHabits.length} ${v.subHabits.length === 1 ? "step" : "steps"}.` : "";
  return `${name}: ${amount ? `${amount} ` : ""}${when}${times}, from ${formatDay(v.startDate, "short")}.${steps}`;
}

const toMinutes = (value: number, unit: "min" | "h") => (unit === "h" ? Math.round(value * 60 * 100) / 100 : value);

export function HabitForm({
  mode,
  habitId,
  initial,
  categories,
}: {
  mode: "create" | "edit";
  habitId?: string;
  initial: HabitFormValues;
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const { control, register, handleSubmit, setValue, setError, formState } = useForm<HabitFormValues>({ defaultValues: initial });
  const subs = useFieldArray({ control, name: "subHabits" });
  const v = useWatch({ control }) as HabitFormValues;
  const errors = formState.errors;
  const periodic = v.frequency === "WEEKLY" || v.frequency === "MONTHLY";

  function onSubmit(values: HabitFormValues) {
    setFormError(null);
    const payload: HabitInput = {
      ...values,
      description: values.description?.trim() || null,
      categoryId: values.category && values.category !== "__new" ? values.category : null,
      newCategory: values.category === "__new" ? values.newCategory.trim() || null : null,
      endDate: values.endDate || null,
      targetValue:
        values.targetType === "DURATION" ? toMinutes(Number(values.targetValue), values.durationUnit) : Number(values.targetValue),
      intervalDays: values.frequency === "INTERVAL" ? Number(values.intervalDays) : null,
      timesPerDay: Number(values.timesPerDay),
      reminderTime: values.reminderEnabled ? values.reminderTime || null : null,
      subHabits: values.subHabits.map((s) => ({ ...s, targetValue: Number(s.targetValue) })),
    };
    const parsed = habitInput.safeParse(payload);
    if (!parsed.success) {
      for (const i of parsed.error.issues) setError(i.path.join(".") as keyof HabitFormValues, { message: i.message });
      setFormError("Check the highlighted fields.");
      return;
    }
    start(async () => {
      const res = mode === "create" ? await createHabit(parsed.data) : await updateHabit(habitId!, parsed.data);
      if (!res.ok) {
        for (const [k, message] of Object.entries(res.fieldErrors ?? {})) setError(k as keyof HabitFormValues, { message });
        setFormError(res.error ?? "That didn't save.");
        return;
      }
      toast.success(mode === "create" ? `${values.name} added` : "Changes saved");
      router.push(mode === "create" ? "/today" : "/habits");
      router.refresh();
    });
  }

  // Errors nest by path (subHabits.0.name), so walk the path rather than reading a flat key.
  const err = (path: string): string | undefined =>
    (path.split(".").reduce<unknown>((node, k) => (node as Record<string, unknown> | undefined)?.[k], errors) as { message?: string } | undefined)?.message;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-8 grid gap-4" noValidate>
      <Section title="The habit">
        <Field label="Name" error={err("name")}>
          {(p) => <Input {...p} {...register("name")} maxLength={80} placeholder="Read, Gym, Drink water" autoFocus={mode === "create"} />}
        </Field>
        <Field label="Why it matters (optional)" error={err("description")}>
          {(p) => <Textarea {...p} {...register("description")} maxLength={500} rows={2} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            {(p) => (
              <NativeSelect {...p} {...register("category")}>
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value="__new">New category…</option>
              </NativeSelect>
            )}
          </Field>
          {v.category === "__new" && (
            <Field label="New category name" error={err("newCategory")}>
              {(p) => <Input {...p} {...register("newCategory")} maxLength={40} />}
            </Field>
          )}
        </div>
        <fieldset>
          <legend className="text-sm font-medium">Colour</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {HABIT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                aria-pressed={v.color === c}
                onClick={() => setValue("color", c)}
                className={cn("grid size-8 place-items-center rounded-full ring-offset-2 ring-offset-background", v.color === c && "ring-2 ring-foreground")}
              >
                <span className="size-5 rounded-full" style={{ background: `var(--habit-${c})` }} />
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-sm font-medium">Icon (optional)</legend>
          <div className="mt-2 flex flex-wrap gap-1">
            <button
              type="button"
              aria-pressed={!v.icon}
              onClick={() => setValue("icon", null)}
              className={cn("h-9 rounded-full px-3 text-sm text-muted-foreground hover:bg-accent", !v.icon && "bg-accent text-foreground")}
            >
              None
            </button>
            {HABIT_ICONS.map((name) => {
              const Icon = ICONS[name];
              return (
                <button
                  key={name}
                  type="button"
                  aria-label={name.replace("-", " ")}
                  aria-pressed={v.icon === name}
                  onClick={() => setValue("icon", name)}
                  className={cn("grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground", v.icon === name && "bg-accent text-foreground")}
                >
                  <Icon className="size-4" />
                </button>
              );
            })}
          </div>
        </fieldset>
      </Section>

      <Section title="How you measure it" note="Partial progress counts. 35 of 60 minutes shows as 58%.">
        <Controller
          control={control}
          name="targetType"
          render={({ field }) => (
            <Segmented
              label="Measure"
              value={field.value}
              options={MEASURES}
              onChange={(t) => {
                field.onChange(t);
                if (t === "CHECKBOX") setValue("targetValue", periodic ? v.targetValue : 1);
                if (t === "DURATION") setValue("targetValue", 30);
                if (t === "COUNT" || t === "QUANTITY") setValue("targetValue", 10);
              }}
            />
          )}
        />
        {(v.targetType !== "CHECKBOX" || periodic) && (
          <div className="flex flex-wrap items-end gap-3">
            <Field
              label={periodic ? (v.frequency === "WEEKLY" ? "Target each week" : "Target each month") : "Target each time"}
              error={err("targetValue")}
              className="w-40"
            >
              {(p) => <Input {...p} type="number" inputMode="decimal" min={0} step="any" className="num" {...register("targetValue", { valueAsNumber: true })} />}
            </Field>
            {v.targetType === "DURATION" && (
              <Controller
                control={control}
                name="durationUnit"
                render={({ field }) => (
                  <Segmented label="Time unit" value={field.value} options={[{ value: "min", label: "Minutes" }, { value: "h", label: "Hours" }]} onChange={field.onChange} />
                )}
              />
            )}
            {(v.targetType === "COUNT" || v.targetType === "QUANTITY") && (
              <Field label="Unit" error={err("targetUnit")} className="w-40">
                {(p) => (
                  <Input
                    {...p}
                    {...register("targetUnit")}
                    maxLength={20}
                    placeholder={v.targetType === "COUNT" ? "pages" : "L"}
                    list={`units-${v.targetType}`}
                  />
                )}
              </Field>
            )}
            {v.targetType === "CHECKBOX" && periodic && <p className="pb-2.5 text-muted-foreground">sessions</p>}
            <datalist id="units-COUNT">
              {["pages", "questions", "reps", "sessions", "steps"].map((u) => <option key={u} value={u} />)}
            </datalist>
            <datalist id="units-QUANTITY">
              {["L", "ml", "km", "mi", "kg"].map((u) => <option key={u} value={u} />)}
            </datalist>
          </div>
        )}
      </Section>

      <Section title="When">
        <Field label="Repeats">
          {(p) => (
            <NativeSelect {...p} {...register("frequency")} className="sm:max-w-[320px]">
              {FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
        {v.frequency === "WEEKDAYS" && (
          <fieldset>
            <legend className="text-sm font-medium">Days</legend>
            <div className="mt-2 flex flex-wrap gap-1">
              {WEEKDAYS.map((d) => {
                const on = v.weekdays.includes(d.n);
                return (
                  <button
                    key={d.n}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setValue("weekdays", on ? v.weekdays.filter((x) => x !== d.n) : [...v.weekdays, d.n])}
                    className={cn("h-9 w-12 rounded-full text-sm", on ? "bg-primary text-primary-foreground" : "bg-surface-strong text-muted-foreground hover:text-foreground")}
                  >
                    {d.short}
                  </button>
                );
              })}
              <button type="button" onClick={() => setValue("weekdays", [0, 6])} className="h-9 rounded-full px-3 text-sm text-muted-foreground hover:bg-accent">
                Weekends
              </button>
            </div>
            {err("weekdays") && <p className="mt-2 text-xs text-negative">{err("weekdays")}</p>}
          </fieldset>
        )}
        {v.frequency === "INTERVAL" && (
          <Field label="Every how many days" error={err("intervalDays")} className="w-40">
            {(p) => <Input {...p} type="number" min={2} max={365} className="num" {...register("intervalDays", { valueAsNumber: true })} />}
          </Field>
        )}
        {!periodic && (
          <Field label="Times a day" hint="For habits you do more than once a day, like stretching breaks." error={err("timesPerDay")}>
            {(p) => <Input {...p} type="number" min={1} max={10} className="num w-40" {...register("timesPerDay", { valueAsNumber: true })} />}
          </Field>
        )}
      </Section>

      <Section
        title="Steps (optional)"
        note="Break a habit into parts, like Gym: cardio, weights, stretching. Each step tracks its own progress."
      >
        {subs.fields.length > 0 && (
          <ul className="grid gap-2">
            {subs.fields.map((f, i) => {
              const s = v.subHabits[i];
              return (
                <li key={f.id} className="grid gap-3 rounded-xl bg-background p-3">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_88px_88px]">
                    <Field label="Step" error={err(`subHabits.${i}.name`)}>
                      {(p) => <Input {...p} {...register(`subHabits.${i}.name`)} maxLength={80} />}
                    </Field>
                    <Field label="Measure">
                      {(p) => (
                        <NativeSelect {...p} {...register(`subHabits.${i}.targetType`)}>
                          <option value="CHECKBOX">Check off</option>
                          <option value="DURATION">Minutes</option>
                          <option value="COUNT">Count</option>
                          <option value="QUANTITY">Amount</option>
                        </NativeSelect>
                      )}
                    </Field>
                    {s?.targetType !== "CHECKBOX" ? (
                      <>
                        <Field label="Target" error={err(`subHabits.${i}.targetValue`)}>
                          {(p) => <Input {...p} type="number" min={0} step="any" className="num" {...register(`subHabits.${i}.targetValue`, { valueAsNumber: true })} />}
                        </Field>
                        {s?.targetType === "DURATION" ? (
                          <p className="self-end pb-2.5 text-muted-foreground">min</p>
                        ) : (
                          <Field label="Unit">{(p) => <Input {...p} {...register(`subHabits.${i}.targetUnit`)} maxLength={20} />}</Field>
                        )}
                      </>
                    ) : (
                      <span className="hidden sm:block sm:col-span-2" />
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <label className="mr-auto flex items-center gap-2 text-sm">
                      <Controller
                        control={control}
                        name={`subHabits.${i}.required`}
                        render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
                      />
                      Required
                    </label>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move ${s?.name || "step"} up`} disabled={i === 0} onClick={() => subs.move(i, i - 1)}>
                      <ArrowUp />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Move ${s?.name || "step"} down`}
                      disabled={i === subs.fields.length - 1}
                      onClick={() => subs.move(i, i + 1)}
                    >
                      <ArrowDown />
                    </Button>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${s?.name || "step"}`} onClick={() => subs.remove(i)}>
                      <Trash2 />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div>
          <Button
            type="button"
            variant="outline"
            onClick={() => subs.append({ name: "", targetType: "CHECKBOX", targetValue: 1, targetUnit: null, required: true })}
          >
            <Plus /> Add a step
          </Button>
        </div>
        {subs.fields.length > 0 && (
          <label className="flex items-start justify-between gap-4 rounded-xl bg-background p-3">
            <span>
              <span className="block font-medium">Done means every required step is done</span>
              <span className="block text-sm text-muted-foreground">
                Turn this off to tick the habit yourself and use the steps as a checklist.
              </span>
            </span>
            <Controller
              control={control}
              name="requireSubHabits"
              render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Done means every required step is done" />}
            />
          </label>
        )}
        {periodic && subs.fields.length > 0 && v.targetType !== "CHECKBOX" && (
          <p className="text-sm text-negative">Weekly and monthly habits with steps count sessions. Choose “Check off”.</p>
        )}
      </Section>

      <Section title="Dates and reminder" note="Reminder times show on your Today list. Push notifications aren't switched on yet.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Starts" error={err("startDate")}>
            {(p) => <Input {...p} type="date" {...register("startDate")} />}
          </Field>
          <Field label="Ends (optional)" error={err("endDate")}>
            {(p) => <Input {...p} type="date" {...register("endDate")} />}
          </Field>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex h-10 items-center gap-2">
            <Controller control={control} name="reminderEnabled" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
            Remind me
          </label>
          {v.reminderEnabled && (
            <Field label="At" error={err("reminderTime")} className="w-40">
              {(p) => <Input {...p} type="time" {...register("reminderTime")} />}
            </Field>
          )}
        </div>
      </Section>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t bg-background px-4 py-4 sm:mx-0 sm:rounded-2xl sm:border">
        <p className="min-w-0 flex-1 text-muted-foreground" aria-live="polite">
          {formError ? <span className="text-negative">{formError}</span> : describe(v)}
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : mode === "create" ? "Add habit" : "Save changes"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 rounded-2xl bg-surface p-5 sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-8">
      <div>
        <h2 className="text-base font-medium">{title}</h2>
        {note && <p className="mt-1 text-sm text-muted-foreground">{note}</p>}
      </div>
      <div className="grid min-w-0 gap-4">{children}</div>
    </section>
  );
}
