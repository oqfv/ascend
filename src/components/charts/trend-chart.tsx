"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Granularity, TrendPoint } from "@/lib/data/analytics";
import { formatDay, formatMonth, formatRange } from "@/lib/format";
import { TooltipBox } from "./chart-frame";

const AXIS = { fontSize: 12, fill: "var(--muted-foreground)" };

function label(p: TrendPoint, g: Granularity, short = false) {
  if (g === "day") return short ? formatDay(p.start, "short") : formatDay(p.start, "medium");
  if (g === "week") return short ? formatDay(p.start, "short") : `Week of ${formatRange(p.start, p.end)}`;
  return short ? formatMonth(p.start).replace(/ \d{4}$/, "") : formatMonth(p.start);
}

const pct = (v: number | null) => (v === null ? "No habits due" : `${v.toFixed(0)}%`);

/**
 * Completion rate over time on a fixed 0–100% axis. Periods with nothing due are gaps,
 * not zeros. The previous period, when shown, is a dashed grey reference on the same axis.
 */
export function TrendChart({ data, granularity, compare }: { data: TrendPoint[]; granularity: Granularity; compare: boolean }) {
  const rows = data.map((p) => ({ ...p, x: label(p, granularity, true) }));
  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer>
        <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="x" tick={AXIS} tickLine={false} axisLine={{ stroke: "var(--control)" }} minTickGap={24} interval="preserveStartEnd" />
          <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} tick={AXIS} tickLine={false} axisLine={false} width={48} />
          <Tooltip
            cursor={{ stroke: "var(--control)", strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as TrendPoint;
              return (
                <TooltipBox
                  title={label(p, granularity)}
                  lines={[
                    { label: "Completion", value: p.eligible ? `${pct(p.rate)} · ${p.completed} of ${p.eligible}` : pct(null) },
                    ...(compare && p.prevEligible !== null
                      ? [{ label: "Previous period", value: p.prevEligible ? `${pct(p.prevRate)} · ${p.prevCompleted} of ${p.prevEligible}` : pct(null), muted: true }]
                      : []),
                  ]}
                />
              );
            }}
          />
          {compare && (
            <Line
              dataKey="prevRate"
              stroke="var(--compare)"
              strokeWidth={2}
              strokeDasharray="4 3"
              dot={false}
              activeDot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          )}
          <Line
            dataKey="rate"
            stroke="var(--data)"
            strokeWidth={2}
            // A point with no neighbour draws no line segment, so it gets a dot of its own.
            dot={(props: { cx?: number; cy?: number; index?: number }) => {
              const i = props.index ?? 0;
              const lone = rows[i]?.rate !== null && rows[i - 1]?.rate == null && rows[i + 1]?.rate == null;
              return lone && props.cx !== undefined && props.cy !== undefined ? (
                <circle key={i} cx={props.cx} cy={props.cy} r={4} fill="var(--data)" />
              ) : (
                <g key={i} />
              );
            }}
            activeDot={{ r: 4, fill: "var(--data)", stroke: "var(--surface)", strokeWidth: 2 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
