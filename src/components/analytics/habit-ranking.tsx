"use client";

import { useState } from "react";
import { BarList } from "@/components/charts/bar-list";
import { ChartFrame, DataTable } from "@/components/charts/chart-frame";
import { Segmented } from "@/components/controls";
import { formatPercent } from "@/lib/format";

export interface RankRow {
  habitId: string;
  name: string;
  categoryName: string | null;
  kind: "day" | "period";
  rate: number | null;
  completed: number;
  eligible: number;
  archived: boolean;
}

type Sort = "rate" | "name" | "category";

export function HabitRanking({ rows }: { rows: RankRow[] }) {
  const [sort, setSort] = useState<Sort>("rate");
  const sorted = [...rows].sort((a, b) =>
    sort === "name"
      ? a.name.localeCompare(b.name)
      : sort === "category"
        ? (a.categoryName ?? "~").localeCompare(b.categoryName ?? "~") || a.name.localeCompare(b.name)
        : (b.rate ?? -1) - (a.rate ?? -1) || a.name.localeCompare(b.name),
  );
  const rated = rows.filter((r) => r.rate !== null);
  const lowest = rated.length > 1 ? rated.reduce((m, r) => (r.rate! < m.rate! ? r : m)) : null;

  return (
    <ChartFrame
      title="Habit performance"
      summary={lowest ? `${lowest.name} has the lowest completion rate in this range.` : "Completion rate for each habit in this range."}
      aside={
        <Segmented
          label="Sort by"
          value={sort}
          onChange={setSort}
          options={[
            { value: "rate", label: "Rate" },
            { value: "name", label: "Name" },
            { value: "category", label: "Category" },
          ]}
        />
      }
      table={
        <DataTable
          head={["Habit", "Completed", "Due", "Rate"]}
          rows={sorted.map((r) => [r.name, r.completed, r.eligible, formatPercent(r.rate, 1)])}
        />
      }
    >
      {rows.length === 0 ? (
        <p className="text-muted-foreground">No habits in this range.</p>
      ) : (
        <BarList
          rows={sorted.map((r) => ({
            key: r.habitId,
            label: r.name,
            sublabel: [r.categoryName, r.archived ? "Archived" : null].filter(Boolean).join(" · ") || undefined,
            value: r.rate,
            valueText: formatPercent(r.rate),
            detail: r.eligible ? `${r.completed} of ${r.eligible} ${r.kind === "period" ? "periods" : "due"}` : "Nothing due",
            emphasis: lowest?.habitId === r.habitId,
          }))}
        />
      )}
    </ChartFrame>
  );
}
