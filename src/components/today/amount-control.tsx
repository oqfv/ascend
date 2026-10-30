"use client";

import { useEffect, useId, useState } from "react";
import { Check } from "lucide-react";
import type { TargetType } from "@/lib/domain/schedule";
import { cn } from "@/lib/utils";

export function CheckButton({
  checked,
  partial,
  disabled,
  label,
  onToggle,
  size = "md",
}: {
  checked: boolean;
  partial?: boolean;
  disabled?: boolean;
  label: string;
  onToggle: () => void;
  size?: "md" | "sm";
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked ? "true" : partial ? "mixed" : "false"}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "grid shrink-0 place-items-center rounded-full border-[1.5px] transition-colors duration-150",
        "disabled:cursor-not-allowed disabled:opacity-50",
        size === "md" ? "size-7" : "size-5",
        checked
          ? "border-data bg-data text-white dark:text-[#0b1a18]"
          : partial
            ? "border-data bg-data-soft"
            : "border-control bg-background hover:border-data",
      )}
    >
      {checked && <Check className={size === "md" ? "size-4" : "size-3"} strokeWidth={2.5} />}
    </button>
  );
}

const STEP: Record<Exclude<TargetType, "CHECKBOX">, number> = { DURATION: 5, COUNT: 1, QUANTITY: 0.1 };

/** A typed amount committed on Enter or blur, with a one-tap fill to the target. */
export function AmountInput({
  value,
  target,
  targetType,
  unit,
  disabled,
  label,
  onCommit,
}: {
  value: number;
  target: number;
  targetType: Exclude<TargetType, "CHECKBOX">;
  unit: string | null;
  disabled?: boolean;
  label: string;
  onCommit: (value: number) => void;
}) {
  const id = useId();
  const [text, setText] = useState(value ? String(value) : "");
  useEffect(() => setText(value ? String(value) : ""), [value]);

  function commit(raw = text) {
    const n = raw.trim() === "" ? 0 : Number(raw.replace(",", "."));
    if (!Number.isFinite(n) || n < 0) {
      setText(value ? String(value) : "");
      return;
    }
    const rounded = Math.round(n * 100) / 100;
    if (rounded !== value) onCommit(rounded);
  }

  const shownUnit = targetType === "DURATION" ? "min" : unit;
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="flex h-9 items-center rounded-full border border-input bg-background pr-3 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
        <input
          id={id}
          inputMode="decimal"
          disabled={disabled}
          value={text}
          placeholder="0"
          onChange={(e) => setText(e.target.value)}
          onBlur={() => commit()}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              const step = STEP[targetType];
              const next = Math.max(0, Math.round(((Number(text) || 0) + (e.key === "ArrowUp" ? step : -step)) * 100) / 100);
              setText(String(next));
            }
          }}
          className="num h-full w-16 bg-transparent pl-3 text-right outline-none disabled:cursor-not-allowed"
        />
        {shownUnit && <span className="pl-1 text-muted-foreground">{shownUnit}</span>}
      </div>
      {target > 0 && value < target && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onCommit(target)}
          className="h-9 rounded-full px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
        >
          Fill
        </button>
      )}
    </div>
  );
}
