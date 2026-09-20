"use client";

import { Camera } from "lucide-react";
import type { WidgetFamily, WidgetFocus } from "@/lib/scriptable";
import { cn, formatNumber } from "@/lib/utils";
import type { WidgetPayload } from "@/types/widget";

/** Point sizes iOS gives each widget family on a 6.1" iPhone / 11" iPad. */
export const WIDGET_SIZES: Record<WidgetFamily, { w: number; h: number }> = {
  small: { w: 158, h: 158 },
  medium: { w: 338, h: 158 },
  large: { w: 338, h: 354 },
  extraLarge: { w: 715, h: 354 },
  accessoryCircular: { w: 76, h: 76 },
  accessoryRectangular: { w: 160, h: 72 },
  accessoryInline: { w: 240, h: 26 },
};

const MACROS = [
  { key: "protein", label: "Protein", short: "P", color: "var(--chart-1)" },
  { key: "carbs", label: "Kohlenhydrate", short: "KH", color: "var(--chart-2)" },
  { key: "fat", label: "Fett", short: "F", color: "var(--chart-3)" },
] as const;

function Ring({
  size,
  stroke,
  progress,
  value,
  label,
  over,
}: {
  size: number;
  stroke: number;
  progress: number;
  value: string;
  label: string;
  over: boolean;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = Math.min(progress, 1);
  const overflow = Math.max(0, Math.min(progress - 1, 1));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--primary)"
          strokeOpacity={0.16}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference * filled} ${circumference}`}
        />
        {overflow > 0 ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--warning)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference * overflow} ${circumference}`}
          />
        ) : null}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn("font-bold leading-none", over && "text-[var(--warning)]")}
          style={{ fontSize: Math.round(size * 0.27) }}
        >
          {value}
        </span>
        <span
          className="mt-0.5 font-medium leading-none text-muted-foreground"
          style={{ fontSize: Math.max(8, Math.round(size * 0.1)) }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

function MacroBars({
  data,
  width,
  withFiber,
}: {
  data: WidgetPayload;
  width: number;
  withFiber?: boolean;
}) {
  const rows = withFiber
    ? [...MACROS, { key: "fiber", label: "Ballaststoffe", short: "B", color: "var(--primary)" } as const]
    : MACROS;
  return (
    <div className="flex flex-col gap-2" style={{ width }}>
      {rows.map((macro) => {
        const value = data.today.totals[macro.key];
        const goal = Math.max(1, data.goals[macro.key]);
        const ratio = value / goal;
        return (
          <div key={macro.key} className="space-y-1">
            <div className="flex items-baseline justify-between gap-2 text-[10px] leading-none">
              <span className="font-medium text-muted-foreground">
                {macro.label}
              </span>
              <span className="font-semibold tabular-nums">
                {formatNumber(value)} / {formatNumber(goal)} g
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--primary)]/15">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, ratio * 100)}%`,
                  background: ratio > 1.05 ? "var(--warning)" : macro.color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MealRows({ data, limit }: { data: WidgetPayload; limit: number }) {
  const meals = data.today.meals.slice(0, limit);
  if (meals.length === 0) {
    return (
      <p className="text-[11px] font-medium text-muted-foreground">
        Noch nichts erfasst
      </p>
    );
  }
  return (
    <ul className="space-y-1.5">
      {meals.map((meal) => (
        <li
          key={meal.id}
          className="flex items-baseline gap-1.5 text-[11px] leading-none"
        >
          <span className="tabular-nums text-muted-foreground/70">
            {meal.time}
          </span>
          <span className="min-w-0 flex-1 truncate font-semibold">
            {meal.name}
          </span>
          <span className="tabular-nums font-semibold text-muted-foreground">
            {formatNumber(meal.calories)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function WeekChart({ data, height }: { data: WidgetPayload; height: number }) {
  const goal = Math.max(1, data.goals.calories);
  const peak = Math.max(goal, ...data.week.map((day) => day.calories)) * 1.05;
  return (
    <div className="flex items-end gap-1.5" style={{ height: height + 14 }}>
      {data.week.map((day) => {
        const barHeight = Math.max(3, (day.calories / peak) * height);
        return (
          <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full rounded"
              style={{
                height: barHeight,
                background:
                  day.calories > goal * 1.05
                    ? "var(--warning)"
                    : day.isToday
                      ? "var(--primary)"
                      : "color-mix(in oklab, var(--primary) 16%, transparent)",
              }}
            />
            <span
              className={cn(
                "text-[9px] leading-none",
                day.isToday
                  ? "font-bold text-foreground"
                  : "font-medium text-muted-foreground/70",
              )}
            >
              {day.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold text-primary-foreground">
      <Camera className="h-3 w-3" />
      {label}
    </span>
  );
}

function Header({ trailing }: { trailing: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] leading-none">
      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
      <span className="font-semibold text-muted-foreground">NutriSight</span>
      <span className="ml-auto font-medium text-muted-foreground">
        {trailing}
      </span>
    </div>
  );
}

function HomeShell({
  family,
  children,
}: {
  family: WidgetFamily;
  children: React.ReactNode;
}) {
  const { w, h } = WIDGET_SIZES[family];
  return (
    <div
      className="shrink-0 overflow-hidden rounded-[1.375rem] text-foreground shadow-[0_8px_24px_-10px_rgb(16_35_28/0.45)] ring-1 ring-[var(--glass-stroke)]"
      style={{
        width: w,
        height: h,
        background:
          "linear-gradient(140deg, color-mix(in oklab, var(--primary) 8%, var(--background)) 0%, color-mix(in oklab, var(--primary) 20%, var(--background)) 100%)",
      }}
    >
      {children}
    </div>
  );
}

/** Lock-screen widgets render monochrome; iOS tints them to the wallpaper. */
function LockShell({
  family,
  children,
}: {
  family: WidgetFamily;
  children: React.ReactNode;
}) {
  const { w, h } = WIDGET_SIZES[family];
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-[1rem] bg-[#3b4a55] text-white"
      style={{ width: w + 16, height: h + 16 }}
    >
      <div style={{ width: w, height: h }}>{children}</div>
    </div>
  );
}

export function WidgetPreview({
  family,
  focus,
  data,
}: {
  family: WidgetFamily;
  focus: WidgetFocus;
  data: WidgetPayload;
}) {
  const goal = Math.max(1, data.goals.calories);
  const eaten = data.today.totals.calories;
  const left = Math.round(goal - eaten);
  const progress = eaten / goal;
  const ringValue = formatNumber(Math.abs(left));
  const ringLabel = left < 0 ? "kcal drüber" : "kcal übrig";

  if (family === "accessoryCircular") {
    const size = 76;
    const radius = (size - 8) / 2;
    const circumference = 2 * Math.PI * radius;
    return (
      <LockShell family={family}>
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#ffffff"
              strokeOpacity={0.25}
              strokeWidth={8}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#ffffff"
              strokeWidth={8}
              strokeLinecap="round"
              strokeDasharray={`${circumference * Math.min(progress, 1)} ${circumference}`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
            <span className="text-[15px] font-bold">{ringValue}</span>
            <span className="text-[9px] font-medium text-white/75">kcal</span>
          </div>
        </div>
      </LockShell>
    );
  }

  if (family === "accessoryRectangular") {
    return (
      <LockShell family={family}>
        <div className="flex h-full flex-col justify-center gap-1">
          <p className="text-[11px] font-semibold text-white/70">NutriSight</p>
          <p className="text-[16px] font-bold leading-none">
            {ringValue} {ringLabel}
          </p>
          <p className="text-[11px] font-medium text-white/75">
            P {formatNumber(data.today.totals.protein)} · KH{" "}
            {formatNumber(data.today.totals.carbs)} · F{" "}
            {formatNumber(data.today.totals.fat)}
          </p>
        </div>
      </LockShell>
    );
  }

  if (family === "accessoryInline") {
    return (
      <LockShell family={family}>
        <p className="flex h-full items-center gap-1 text-[12px] font-medium">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
            <path d="M7 2v8a3 3 0 0 0 2 2.83V22h2V12.83A3 3 0 0 0 13 10V2h-1.5v7h-1V2h-1v7h-1V2H7Zm10 0c-1.66 0-3 2.24-3 5v6h2v9h2V2h-1Z" />
          </svg>
          {ringValue} {ringLabel}
        </p>
      </LockShell>
    );
  }

  if (family === "small") {
    return (
      <HomeShell family={family}>
        <div className="flex h-full flex-col p-3.5">
          <Header trailing={`${formatNumber(eaten)} kcal`} />
          <div className="mt-1.5 flex justify-center">
            <Ring
              size={92}
              stroke={9}
              progress={progress}
              value={ringValue}
              label={ringLabel}
              over={left < 0}
            />
          </div>
          <div className="mt-auto flex justify-between">
            {MACROS.map((macro) => (
              <div key={macro.key} className="flex flex-col gap-0.5">
                <span className="flex items-center gap-1 text-[9px] font-medium leading-none text-muted-foreground">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: macro.color }}
                  />
                  {macro.short}
                </span>
                <span className="text-[11px] font-semibold leading-none">
                  {formatNumber(data.today.totals[macro.key])} g
                </span>
              </div>
            ))}
          </div>
        </div>
      </HomeShell>
    );
  }

  if (family === "medium") {
    return (
      <HomeShell family={family}>
        <div className="flex h-full flex-col p-4">
          <Header
            trailing={`${data.today.mealCount} ${data.today.mealCount === 1 ? "Mahlzeit" : "Mahlzeiten"}`}
          />
          <div className="mt-2 flex flex-1 items-center gap-3.5">
            <Ring
              size={96}
              stroke={9}
              progress={progress}
              value={ringValue}
              label={ringLabel}
              over={left < 0}
            />
            {focus === "mahlzeiten" ? (
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="text-[11px] font-semibold text-muted-foreground">
                  Heute
                </p>
                <MealRows data={data} limit={4} />
              </div>
            ) : focus === "ring" ? (
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-[13px] font-semibold leading-tight">
                  {data.today.label}
                </p>
                <p className="text-[12px] font-medium text-muted-foreground">
                  {formatNumber(eaten)} von {formatNumber(goal)} kcal
                </p>
              </div>
            ) : (
              <MacroBars data={data} width={156} />
            )}
          </div>
        </div>
      </HomeShell>
    );
  }

  if (family === "large") {
    return (
      <HomeShell family={family}>
        <div className="flex h-full flex-col p-4">
          <div className="flex items-center gap-2">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold leading-tight">
                {data.today.label}
              </p>
              <p className="text-[11px] font-medium text-muted-foreground">
                {formatNumber(eaten)} von {formatNumber(goal)} kcal
              </p>
            </div>
            <span className="ml-auto">
              <Chip label="Erfassen" />
            </span>
          </div>
          <div className="mt-3 flex items-center gap-4">
            <Ring
              size={118}
              stroke={11}
              progress={progress}
              value={ringValue}
              label={ringLabel}
              over={left < 0}
            />
            <MacroBars data={data} width={150} withFiber />
          </div>
          <div className="mt-3 rounded-2xl border border-[var(--glass-stroke)] bg-white/15 p-2.5">
            <div className="flex items-center justify-between text-[11px] leading-none">
              <span className="font-semibold text-muted-foreground">Heute</span>
              {data.streak > 1 ? (
                <span className="font-semibold text-primary">
                  {data.streak} Tage in Folge
                </span>
              ) : null}
            </div>
            <div className="mt-2">
              <MealRows data={data} limit={5} />
            </div>
          </div>
          <div className="flex-1" />
        </div>
      </HomeShell>
    );
  }

  const average = Math.round(
    data.week.reduce((total, day) => total + day.calories, 0) /
      Math.max(1, data.week.length),
  );
  return (
    <HomeShell family="extraLarge">
      <div className="flex h-full flex-col p-[18px]">
        <div className="flex items-center gap-2">
          <div className="min-w-0">
            <p className="text-[17px] font-bold leading-tight">
              Hallo {(data.user.name ?? "").split(" ")[0] || "du"}
            </p>
            <p className="text-[12px] font-medium text-muted-foreground">
              {data.today.label}
            </p>
          </div>
          <span className="ml-auto">
            <Chip label="Mahlzeit erfassen" />
          </span>
        </div>
        <div className="mt-3.5 flex flex-1 gap-[18px]">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-4">
              <Ring
                size={128}
                stroke={12}
                progress={progress}
                value={ringValue}
                label={ringLabel}
                over={left < 0}
              />
              <MacroBars data={data} width={170} withFiber />
            </div>
            <div className="mt-3.5 rounded-2xl border border-[var(--glass-stroke)] bg-white/15 p-2.5">
              <p className="text-[11px] font-semibold leading-none text-muted-foreground">
                Heute
              </p>
              <div className="mt-2">
                <MealRows data={data} limit={6} />
              </div>
            </div>
          </div>
          <div className="flex w-[268px] shrink-0 flex-col gap-3">
            <div className="rounded-2xl border border-[var(--glass-stroke)] bg-white/15 p-2.5">
              <div className="flex items-center justify-between text-[11px] leading-none">
                <span className="font-semibold text-muted-foreground">
                  7 Tage
                </span>
                <span className="font-semibold">
                  Ø {formatNumber(average)} kcal
                </span>
              </div>
              <div className="mt-2.5">
                <WeekChart data={data} height={74} />
              </div>
            </div>
            <div className="space-y-1.5 rounded-2xl border border-[var(--glass-stroke)] bg-white/15 p-2.5 text-[11px] leading-none">
              <div className="flex items-center justify-between">
                <span className="font-medium text-muted-foreground">Serie</span>
                <span className="font-semibold">
                  {data.streak} {data.streak === 1 ? "Tag" : "Tage"}
                </span>
              </div>
              {data.weight ? (
                <div className="flex items-center justify-between">
                  <span className="font-medium text-muted-foreground">
                    Gewicht
                  </span>
                  <span className="font-semibold">
                    {data.weight.kg} kg
                    {data.weight.trendKg !== null
                      ? ` (${data.weight.trendKg > 0 ? "+" : ""}${data.weight.trendKg})`
                      : ""}
                  </span>
                </div>
              ) : null}
              <div className="flex items-center justify-between">
                <span className="font-medium text-muted-foreground">
                  Ballaststoffe
                </span>
                <span className="font-semibold">
                  {formatNumber(data.today.totals.fiber)} /{" "}
                  {formatNumber(data.goals.fiber)} g
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </HomeShell>
  );
}
