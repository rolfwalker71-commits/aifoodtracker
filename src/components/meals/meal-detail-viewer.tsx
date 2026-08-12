"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown, CopyPlus, Pencil, Star } from "lucide-react";
import { NutrientProgress } from "@/components/dashboard/nutrient-progress";
import { Button } from "@/components/ui/button";
import { formatAppDateTime } from "@/lib/datetime";
import { getMealQualityTip } from "@/lib/meal-quality-tip";
import {
  MEAL_TYPE_LABELS,
  type NutrientTotals,
  type NutritionGoals,
} from "@/lib/nutrition";
import { cn, formatNumber } from "@/lib/utils";
import type { MealFormValues } from "@/types/meals";

type Goals = NutritionGoals;

type Props = {
  values: MealFormValues;
  goals: Goals | null;
  dayTotals: Pick<
    NutrientTotals,
    "calories" | "protein" | "carbs" | "fat" | "fiber"
  > | null;
  mealIsToday: boolean;
  isFavorite: boolean;
  busy?: boolean;
  onEdit: () => void;
  onToggleFavorite: () => void;
  onDuplicate: () => void;
};

const PAGE_COUNT = 3;
const PAGE_LABELS = ["Überblick", "Zutaten & Coach", "Heute & Ziele"] as const;

export function MealDetailViewer({
  values,
  goals,
  dayTotals,
  mealIsToday,
  isFavorite,
  busy,
  onEdit,
  onToggleFavorite,
  onDuplicate,
}: Props) {
  const [page, setPage] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Array<HTMLElement | null>>([]);

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const onScroll = () => {
      const w = el.clientWidth || 1;
      const idx = Math.round(el.scrollLeft / w);
      setPage(Math.min(PAGE_COUNT - 1, Math.max(0, idx)));
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const node = pageRefs.current[page];
    if (node) node.scrollTop = 0;
  }, [page]);

  function goTo(index: number) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
    setPage(index);
  }

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden bg-background",
        // Mobile/PWA: fill remaining viewport (parent sets height)
        "h-full",
        // Desktop card look when parent gives fixed taller height
        "md:rounded-2xl md:border md:border-border",
      )}
    >
      <div
        ref={scrollerRef}
        className={cn(
          "flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden",
          "overscroll-x-contain touch-pan-x",
          "[-webkit-overflow-scrolling:touch] [scrollbar-width:none]",
          "[&::-webkit-scrollbar]:hidden",
        )}
      >
        <section
          ref={(node) => {
            pageRefs.current[0] = node;
          }}
          className="h-full min-h-0 w-full min-w-full shrink-0 snap-center snap-always overflow-y-auto overscroll-y-contain px-4 py-3 pb-4 touch-pan-y"
        >
          <OverviewPage
            values={values}
            isFavorite={isFavorite}
            busy={busy}
            onEdit={onEdit}
            onToggleFavorite={onToggleFavorite}
            onDuplicate={onDuplicate}
          />
        </section>
        <section
          ref={(node) => {
            pageRefs.current[1] = node;
          }}
          className="h-full min-h-0 w-full min-w-full shrink-0 snap-center snap-always overflow-y-auto overscroll-y-contain px-4 py-3 pb-4 touch-pan-y"
        >
          <InsightPage values={values} goals={goals} onEdit={onEdit} />
        </section>
        <section
          ref={(node) => {
            pageRefs.current[2] = node;
          }}
          className="h-full min-h-0 w-full min-w-full shrink-0 snap-center snap-always overflow-y-auto overscroll-y-contain px-4 py-3 pb-4 touch-pan-y"
        >
          <GoalsPage
            values={values}
            goals={goals}
            dayTotals={dayTotals}
            mealIsToday={mealIsToday}
          />
        </section>
      </div>

      <div className="flex shrink-0 flex-col items-center gap-1 border-t border-border/60 bg-background px-4 py-2.5">
        <div className="flex items-center justify-center gap-2">
          {PAGE_LABELS.map((label, index) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              className={cn(
                "h-2.5 rounded-full transition-all",
                index === page
                  ? "w-6 bg-primary"
                  : "w-2.5 bg-muted-foreground/35",
              )}
              onClick={() => goTo(index)}
            />
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {PAGE_LABELS[page]} · wischen
        </p>
      </div>
    </div>
  );
}

function OverviewPage({
  values,
  isFavorite,
  busy,
  onEdit,
  onToggleFavorite,
  onDuplicate,
}: {
  values: MealFormValues;
  isFavorite: boolean;
  busy?: boolean;
  onEdit: () => void;
  onToggleFavorite: () => void;
  onDuplicate: () => void;
}) {
  return (
    <div className="flex min-h-full w-full flex-col justify-center gap-4 py-1">
      <div className="mx-auto h-32 w-32 overflow-hidden rounded-2xl bg-muted sm:h-40 sm:w-40">
        {values.imagePath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={values.imagePath}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Kein Bild
          </div>
        )}
      </div>

      <div className="space-y-1.5 text-center">
        <h2 className="font-display text-xl font-bold leading-snug break-words sm:text-2xl">
          {values.name}
        </h2>
        <p className="text-sm">
          <span className="font-bold">{MEAL_TYPE_LABELS[values.mealType]}</span>
          <span className="text-muted-foreground">
            {" "}
            · {formatAppDateTime(values.consumedAt)}
          </span>
        </p>
        <p className="text-sm text-muted-foreground">
          {values.portionSize?.trim() || "Menge unbekannt"}
        </p>
        <p className="text-base font-medium">
          {formatNumber(values.calories, 0)} kcal · P{" "}
          {formatNumber(values.protein, 0)}g · K {formatNumber(values.carbs, 0)}
          g · F {formatNumber(values.fat, 0)}g
        </p>
        {values.notes?.trim() ? (
          <p className="text-sm text-muted-foreground">{values.notes.trim()}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Button type="button" size="lg" className="h-12 w-full" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
          Bearbeiten
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="h-12"
            disabled={busy}
            onClick={onDuplicate}
          >
            <CopyPlus className="h-4 w-4" />
            Nochmal
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="h-12"
            disabled={busy}
            onClick={onToggleFavorite}
          >
            <Star
              className={cn(
                "h-4 w-4",
                isFavorite && "fill-amber-500 text-amber-500",
              )}
            />
            {isFavorite ? "Favorit" : "Merken"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function InsightPage({
  values,
  goals,
  onEdit,
}: {
  values: MealFormValues;
  goals: Goals | null;
  onEdit: () => void;
}) {
  const tip = getMealQualityTip(values, goals);
  const ingredients = values.ingredients ?? [];

  return (
    <div className="flex min-h-full w-full flex-col gap-4">
      <section className="flex min-h-0 flex-1 flex-col gap-2">
        <h2 className="shrink-0 font-display text-lg font-bold sm:text-xl">
          Zutaten & Menge
        </h2>
        <p className="shrink-0 text-sm text-muted-foreground">
          Portion:{" "}
          <span className="font-medium text-foreground">
            {values.portionSize?.trim() || "unbekannt"}
          </span>
        </p>
        {ingredients.length ? (
          <ul className="min-h-0 flex-1 divide-y divide-border/70 overflow-y-auto rounded-2xl border border-border">
            {ingredients.map((item, index) => (
              <li
                key={`${item.name}-${index}`}
                className="flex items-start justify-between gap-3 px-4 py-3.5 text-sm"
              >
                <span className="font-medium leading-snug">{item.name}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {item.portionSize ||
                    (item.grams ? `${formatNumber(item.grams, 0)} g` : "–")}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            Keine Zutaten hinterlegt.
          </p>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-11 w-full shrink-0"
          onClick={onEdit}
        >
          Menge anpassen
        </Button>
      </section>

      <section className="shrink-0 space-y-2">
        <h2 className="font-display text-lg font-bold sm:text-xl">Coach</h2>
        <div
          className={cn(
            "rounded-2xl border p-4",
            tip.tone === "positive" &&
              "border-emerald-600/30 bg-emerald-500/10",
            tip.tone === "attention" && "border-amber-600/30 bg-amber-500/10",
            tip.tone === "neutral" && "border-border bg-background",
          )}
        >
          <p className="text-sm font-semibold">{tip.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{tip.body}</p>
          {tip.alternatives?.length ? (
            <ul className="mt-3 list-disc space-y-1 pl-4 text-sm text-muted-foreground">
              {tip.alternatives.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function TodaySummary({
  values,
  goals,
  dayTotals,
  mealIsToday,
}: {
  values: MealFormValues;
  goals: Goals;
  dayTotals: Pick<
    NutrientTotals,
    "calories" | "protein" | "carbs" | "fat" | "fiber"
  >;
  mealIsToday: boolean;
}) {
  const kcalGoal = goals.dailyCaloriesGoal;
  const proteinGoal = goals.dailyProteinGoal;
  const todayKcal = dayTotals.calories;
  const todayProtein = dayTotals.protein;
  const kcalLeft = Math.max(0, kcalGoal - todayKcal);
  const proteinLeft = Math.max(0, proteinGoal - todayProtein);
  const withoutMealKcal = mealIsToday
    ? Math.max(0, todayKcal - values.calories)
    : todayKcal;
  const withoutMealProtein = mealIsToday
    ? Math.max(0, todayProtein - values.protein)
    : todayProtein;

  return (
    <div className="grid gap-2 rounded-2xl border border-border bg-background p-3 text-sm sm:grid-cols-3 sm:gap-3 sm:p-4">
      {mealIsToday ? (
        <>
          <div className="space-y-1 rounded-xl bg-muted/40 px-3 py-3">
            <p className="text-xs text-muted-foreground">Ohne diese Mahlzeit</p>
            <p className="font-semibold tabular-nums">
              {formatNumber(withoutMealKcal, 0)} kcal
            </p>
            <p className="text-muted-foreground tabular-nums">
              {formatNumber(withoutMealProtein, 0)} g Protein
            </p>
          </div>
          <div className="space-y-1 rounded-xl bg-muted/40 px-3 py-3">
            <p className="text-xs text-muted-foreground">Inkl. dieser Mahlzeit</p>
            <p className="font-semibold tabular-nums">
              {formatNumber(todayKcal, 0)} / {formatNumber(kcalGoal, 0)} kcal
            </p>
            <p className="text-muted-foreground tabular-nums">
              {formatNumber(todayProtein, 0)} / {formatNumber(proteinGoal, 0)} g
              Protein
            </p>
          </div>
          <div className="space-y-1 rounded-xl bg-primary/10 px-3 py-3">
            <p className="text-xs text-muted-foreground">Noch übrig heute</p>
            <p className="font-semibold tabular-nums">
              {formatNumber(kcalLeft, 0)} kcal
            </p>
            <p className="text-muted-foreground tabular-nums">
              {formatNumber(proteinLeft, 0)} g Protein
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-1 rounded-xl bg-muted/40 px-3 py-3 sm:col-span-2">
            <p className="text-xs text-muted-foreground">
              Diese Mahlzeit ist von einem anderen Tag · Heute bisher
            </p>
            <p className="font-semibold tabular-nums">
              {formatNumber(todayKcal, 0)} / {formatNumber(kcalGoal, 0)} kcal
            </p>
            <p className="text-muted-foreground tabular-nums">
              {formatNumber(todayProtein, 0)} g Protein
            </p>
          </div>
          <div className="space-y-1 rounded-xl bg-primary/10 px-3 py-3">
            <p className="text-xs text-muted-foreground">Noch übrig heute</p>
            <p className="font-semibold tabular-nums">
              {formatNumber(kcalLeft, 0)} kcal
            </p>
            <p className="text-muted-foreground tabular-nums">
              {formatNumber(proteinLeft, 0)} g Protein
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function GoalsPage({
  values,
  goals,
  dayTotals,
  mealIsToday,
}: {
  values: MealFormValues;
  goals: Goals | null;
  dayTotals: Pick<
    NutrientTotals,
    "calories" | "protein" | "carbs" | "fat" | "fiber"
  > | null;
  mealIsToday: boolean;
}) {
  const [more, setMore] = useState(false);

  if (!goals) {
    return (
      <div className="flex min-h-full w-full flex-col gap-3">
        <h2 className="font-display text-lg font-bold sm:text-xl">
          Heute & Ziele
        </h2>
        <p className="text-sm text-muted-foreground">Ziele werden geladen…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-full w-full flex-col gap-4">
      <section className="shrink-0 space-y-2">
        <h2 className="font-display text-lg font-bold sm:text-xl">Heute</h2>
        {dayTotals ? (
          <TodaySummary
            values={values}
            goals={goals}
            dayTotals={dayTotals}
            mealIsToday={mealIsToday}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Tageswerte werden geladen…
          </p>
        )}
      </section>

      <section className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="shrink-0">
          <h2 className="font-display text-lg font-bold sm:text-xl">
            Anteil am Tagesziel
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Beitrag dieser Mahlzeit zu deinen heutigen Zielen.
          </p>
        </div>
        <div className="flex min-h-0 flex-1 flex-col justify-evenly gap-3 rounded-2xl border border-border bg-background p-4">
          <NutrientProgress
            label="Kalorien"
            current={values.calories}
            goal={goals.dailyCaloriesGoal}
            unit="kcal"
          />
          <NutrientProgress
            label="Protein"
            current={values.protein}
            goal={goals.dailyProteinGoal}
            colorClass="bg-teal-600"
          />
          <NutrientProgress
            label="Kohlenhydrate"
            current={values.carbs}
            goal={goals.dailyCarbsGoal}
            colorClass="bg-cyan-600"
          />
          <NutrientProgress
            label="Fett"
            current={values.fat}
            goal={goals.dailyFatGoal}
            colorClass="bg-orange-600"
          />
          <NutrientProgress
            label="Ballaststoffe"
            current={values.fiber}
            goal={goals.dailyFiberGoal}
            colorClass="bg-emerald-700"
          />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-11 w-full shrink-0 justify-between px-1"
            onClick={() => setMore((value) => !value)}
            aria-expanded={more}
          >
            <span>Weitere Nährstoffe</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                more && "rotate-180",
              )}
            />
          </Button>

          {more ? (
            <div className="space-y-4">
              <NutrientProgress
                label="Zucker"
                current={values.sugar}
                goal={goals.dailySugarGoal}
                colorClass="bg-rose-600"
              />
              <NutrientProgress
                label="Natrium"
                current={values.sodium}
                goal={goals.dailySodiumGoal}
                unit="mg"
                colorClass="bg-sky-700"
              />
              <NutrientProgress
                label="Kalium"
                current={values.potassium}
                goal={goals.dailyPotassiumGoal}
                unit="mg"
                colorClass="bg-violet-600"
              />
              <NutrientProgress
                label="Vitamin A"
                current={values.vitaminA}
                goal={goals.dailyVitaminAGoal}
                unit="µg"
                colorClass="bg-amber-600"
              />
              <NutrientProgress
                label="Vitamin C"
                current={values.vitaminC}
                goal={goals.dailyVitaminCGoal}
                unit="mg"
                colorClass="bg-lime-600"
              />
              <NutrientProgress
                label="Vitamin D"
                current={values.vitaminD}
                goal={goals.dailyVitaminDGoal}
                unit="µg"
                colorClass="bg-yellow-600"
              />
              <NutrientProgress
                label="Kalzium"
                current={values.calcium}
                goal={goals.dailyCalciumGoal}
                unit="mg"
                colorClass="bg-stone-600"
              />
              <NutrientProgress
                label="Eisen"
                current={values.iron}
                goal={goals.dailyIronGoal}
                unit="mg"
                colorClass="bg-red-700"
              />
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
