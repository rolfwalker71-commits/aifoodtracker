"use client";

import { Progress } from "@/components/ui/progress";
import { clampPercent, formatNumber } from "@/lib/utils";

type Props = {
  label: string;
  current: number;
  goal: number;
  unit?: string;
  colorClass?: string;
};

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
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {formatNumber(current, unit === "kcal" ? 0 : 1)}
          {unit === "kcal" ? "" : unit} /{" "}
          {formatNumber(goal, unit === "kcal" ? 0 : 1)}
          {unit === "kcal" ? " kcal" : unit}
          <span
            className={
              over ? "ml-2 font-medium text-rose-600" : "ml-2"
            }
          >
            ({formatNumber(rawPercent, 0)}%)
          </span>
        </span>
      </div>
      <Progress
        value={barPercent}
        indicatorClassName={over ? "bg-rose-600" : colorClass}
      />
    </div>
  );
}
