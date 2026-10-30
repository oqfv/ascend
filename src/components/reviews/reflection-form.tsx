"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { saveDailyReview } from "@/app/(app)/reviews/actions";
import { cn } from "@/lib/utils";

const SCALES = [
  { key: "mood", label: "Mood", ends: ["Low", "Great"] },
  { key: "energy", label: "Energy", ends: ["Drained", "Full"] },
  { key: "sleepQuality", label: "Sleep", ends: ["Poor", "Deep"] },
] as const;

type Key = (typeof SCALES)[number]["key"];

export function ReflectionForm({
  date,
  initial,
}: {
  date: string;
  initial: { mood: number | null; energy: number | null; sleepQuality: number | null; reflection: string | null } | null;
}) {
  const [values, setValues] = useState<Record<Key, number | null>>({
    mood: initial?.mood ?? null,
    energy: initial?.energy ?? null,
    sleepQuality: initial?.sleepQuality ?? null,
  });
  const [text, setText] = useState(initial?.reflection ?? "");
  const [savedAt, setSavedAt] = useState<string | null>(initial ? "Saved" : null);
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      const res = await saveDailyReview({ date, ...values, reflection: text });
      if (!res.ok) return void toast.error(res.error);
      setSavedAt("Saved");
      toast.success("Reflection saved");
    });
  }

  return (
    <div className="grid gap-5">
      {SCALES.map((s) => (
        <fieldset key={s.key}>
          <legend className="text-sm font-medium">{s.label}</legend>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="w-14 text-xs text-muted-foreground">{s.ends[0]}</span>
            <div role="radiogroup" aria-label={s.label} className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => {
                const on = values[s.key] === n;
                return (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={`${s.label} ${n} of 5`}
                    onClick={() => {
                      setValues((v) => ({ ...v, [s.key]: on ? null : n }));
                      setSavedAt(null);
                    }}
                    className={cn(
                      "num size-9 rounded-full text-sm transition-colors",
                      on ? "bg-primary text-primary-foreground" : "bg-surface-strong text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            <span className="text-xs text-muted-foreground">{s.ends[1]}</span>
          </div>
        </fieldset>
      ))}
      <div className="grid gap-2">
        <label htmlFor="reflection" className="text-sm font-medium">
          Notes on the day
        </label>
        <Textarea
          id="reflection"
          rows={4}
          maxLength={4000}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setSavedAt(null);
          }}
          placeholder="What helped, what got in the way."
        />
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save reflection"}
        </Button>
        {savedAt && <span className="text-sm text-muted-foreground">{savedAt}</span>}
      </div>
    </div>
  );
}
