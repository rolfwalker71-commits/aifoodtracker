"use client";

import { Progress } from "@/components/ui/progress";
import { clampPercent, cn, formatNumber } from "@/lib/utils";

type Props = {
  label: string;
  current: number;
  goal: number;
  unit?: string;
  colorClass?: string;
};

/** One decimal only where it carries information — never "193.0 g". */
function amount(value: number) {
  const rounded = Math.round(value * 10) / 10;
  const decimals = rounded !== 0 && Math.abs(rounded) < 10 ? 1 : 0;
  return formatNumber(rounded, decimals);
}

export function NutrientProgress({
  label,
  current,
  goal,
  unit = "g",
  colorClass = "bg-primary",
}: Props) {
  const rawPercent = (current / Math.max(goal, 1)) * 100;
  const barPercent = clampPercent(rawPercent);
  const over = current > goal;

  return (
    <div className="space-y-1.5">
      {/* The label may wrap, the numbers never do — they sit in their own
          column so a narrow card cannot break the pair apart. */}
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 text-sm font-medium leading-snug">{label}</span>
        <span className="shrink-0 whitespace-nowrap text-sm tabular-nums">
          <span className={cn("font-semibold", over && "text-destructive")}>
            {amount(current)}
          </span>
          <span className="text-muted-foreground">
            {" / "}
            {amount(goal)} {unit}
          </span>
        </span>
      </div>
      <div className="flex items-center gap-2.5">
        <Progress
          className="w-auto flex-1"
          value={barPercent}
          indicatorClassName={over ? "bg-destructive" : colorClass}
        />
        <span
          className={cn(
            "w-10 shrink-0 text-right text-xs tabular-nums",
            over ? "font-semibold text-destructive" : "text-muted-foreground",
          )}
        >
          {formatNumber(rawPercent, 0)}%
        </span>
      </div>
    </div>
  );
}
