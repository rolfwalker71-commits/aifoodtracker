"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { MACRO_COLORS } from "@/lib/macro-colors";
import { formatNumber } from "@/lib/utils";

type Props = {
  protein: number;
  carbs: number;
  fat: number;
};

const SLICES = [
  { key: "protein", name: "Protein", color: MACRO_COLORS.protein.css },
  { key: "carbs", name: "Kohlenhydrate", color: MACRO_COLORS.carbs.css },
  { key: "fat", name: "Fett", color: MACRO_COLORS.fat.css },
] as const;

function grams(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return formatNumber(rounded, rounded !== 0 && rounded < 10 ? 1 : 0);
}

/**
 * Donut plus its own legend. The legend lives here because the colours do —
 * a separate legend at the call site drifts out of sync and, laid out in fixed
 * columns, collides with itself as soon as the card gets narrow.
 */
export function MacroChart({ protein, carbs, fat }: Props) {
  const values = { protein: Math.max(protein, 0), carbs: Math.max(carbs, 0), fat: Math.max(fat, 0) };
  const data = SLICES.map((slice) => ({ ...slice, value: values[slice.key] }));
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="@container">
      <div className="flex flex-col items-center gap-4 @sm:flex-row @sm:items-center @sm:gap-6">
        <div className="relative h-40 w-40 shrink-0">
          {total > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={data.filter((item) => item.value > 0).length > 1 ? 3 : 0}
                  strokeWidth={0}
                >
                  {data.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [`${grams(Number(value))} g`, String(name)]}
                  contentStyle={{
                    borderRadius: "0.75rem",
                    border: "1px solid var(--border)",
                    background: "var(--popover)",
                    color: "var(--popover-foreground)",
                    fontSize: "0.8125rem",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            /* Same footprint as the chart, so the card keeps its shape on an
               empty day instead of collapsing into a text block. */
            <div className="absolute inset-2 rounded-full border-[26px] border-primary/12" />
          )}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold tabular-nums leading-none">
              {grams(total)} g
            </span>
            <span className="mt-1 text-xs text-muted-foreground">Makros</span>
          </div>
        </div>

        <ul className="w-full min-w-0 space-y-2">
          {data.map((entry) => (
            <li key={entry.key} className="flex items-baseline gap-2.5 text-sm">
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 translate-y-px rounded-full"
                style={{ background: entry.color }}
              />
              <span className="min-w-0 flex-1 leading-snug">{entry.name}</span>
              <span className="shrink-0 whitespace-nowrap tabular-nums font-semibold">
                {grams(entry.value)} g
              </span>
              <span className="w-10 shrink-0 whitespace-nowrap text-right text-xs tabular-nums text-muted-foreground">
                {total > 0 ? `${Math.round((entry.value / total) * 100)}%` : "–"}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {total <= 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Noch keine Makros für diesen Zeitraum.
        </p>
      ) : null}
    </div>
  );
}
