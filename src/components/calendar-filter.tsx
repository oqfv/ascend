"use client";

import { useRouter } from "next/navigation";
import { NativeSelect } from "@/components/controls";

export function CalendarFilter({ habits, habitId, month }: { habits: { id: string; name: string }[]; habitId: string | null; month: string }) {
  const router = useRouter();
  return (
    <NativeSelect
      aria-label="Habit"
      value={habitId ?? ""}
      className="w-48"
      onChange={(e) => router.push(`/calendar?month=${month}${e.target.value ? `&habit=${e.target.value}` : ""}`)}
    >
      <option value="">All habits</option>
      {habits.map((h) => (
        <option key={h.id} value={h.id}>
          {h.name}
        </option>
      ))}
    </NativeSelect>
  );
}
