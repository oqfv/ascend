"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/link-button";
import { createHabit } from "@/app/(app)/habits/actions";
import type { ISODate } from "@/lib/domain/dates";

/** The fastest path: a name becomes a daily checkbox habit. Everything else lives in the full form. */
export function QuickAdd({ startDate }: { startDate: ISODate }) {
  const ref = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const name = ref.current?.value.trim();
    if (!name) return;
    start(async () => {
      const res = await createHabit({
        name,
        description: null,
        categoryId: null,
        newCategory: null,
        icon: null,
        color: null,
        startDate,
        endDate: null,
        frequency: "DAILY",
        weekdays: [],
        intervalDays: null,
        timesPerDay: 1,
        targetType: "CHECKBOX",
        targetValue: 1,
        targetUnit: null,
        requireSubHabits: true,
        reminderEnabled: false,
        reminderTime: null,
        subHabits: [],
      });
      if (!res.ok) {
        toast.error(res.fieldErrors?.name ?? res.error ?? "That habit wasn't added.");
        return;
      }
      if (ref.current) ref.current.value = "";
      toast.success(`${name} added as a daily habit`);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <label htmlFor="quick-add" className="sr-only">
        New daily habit
      </label>
      <div className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-full border border-input bg-background pl-3 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30 sm:max-w-[320px]">
        <Plus className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          id="quick-add"
          ref={ref}
          maxLength={80}
          placeholder="Add a daily habit"
          className="h-full min-w-0 flex-1 bg-transparent pr-3 outline-none placeholder:text-muted-foreground"
          disabled={pending}
        />
      </div>
      <Button type="submit" variant="secondary" disabled={pending}>
        Add
      </Button>
      <LinkButton variant="ghost" href="/habits/new">
        More options
      </LinkButton>
    </form>
  );
}
