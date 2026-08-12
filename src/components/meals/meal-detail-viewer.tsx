"use client";

import { useRef, useState } from "react";
import { motion, type PanInfo } from "framer-motion";
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
  const viewportRef = useRef<HTMLDivElement>(null);

  function onDragEnd(_: unknown, info: PanInfo) {
    const width = viewportRef.current?.offsetWidth ?? 320;
    const delta = info.offset.x + info.velocity.x * 0.2;
    if (delta < -width * 0.2) {
      setPage((p) => Math.min(PAGE_COUNT - 1, p + 1));
    } else if (delta > width * 0.2) {
      setPage((p) => Math.max(0, p - 1));
    }
  }

  const pageLabel =
    page === 0 ? "Überblick" : page === 1 ? "Einblick & Coach" : "Tagesanteil";

  return (
    <div className="space-y-4">
      <div
        ref={viewportRef}
        className="overflow-hidden rounded-2xl border border-border bg-background"
      >
        <motion.div
          className="flex will-change-transform"
          drag="x"
          dragDirectionLock
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={onDragEnd}
          animate={{ x: `-${page * 100}%` }}
          transition={{ type: "spring", stiffness: 380, damping: 36 }}
        >
          <section className="box-border w-full min-w-full shrink-0 touch-pan-y px-4 py-5">
            <OverviewPage
              values={values}
              isFavorite={isFavorite}
              busy={busy}
              onEdit={onEdit}
              onToggleFavorite={onToggleFavorite}
              onDuplicate={onDuplicate}
            />
          </section>
          <section className="box-border w-full min-w-full shrink-0 touch-pan-y px-4 py-5">
            <InsightPage
              values={values}
              goals={goals}
              dayTotals={dayTotals}
              mealIsToday={mealIsToday}
              onEdit={onEdit}
            />
          </section>
          <section className="box-border w-full min-w-full shrink-0 touch-pan-y px-4 py-5">
            <GoalsPage values={values} goals={goals} />
          </section>
        </motion.div>
      </div>

      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: PAGE_COUNT }).map((_, index) => (
          <button
            key={index}
            type="button"
            aria-label={`Seite ${index + 1}`}
            className={cn(
              "h-2.5 rounded-full transition-all",
              index === page
                ? "w-6 bg-primary"
                : "w-2.5 bg-muted-foreground/35",
            )}
            onClick={() => setPage(index)}
          />
        ))}
      </div>
      <p className="text-center text-xs text-muted-foreground">
        {pageLabel} · wischen
      </p>
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
    <div className="space-y-4">
      <div className="mx-auto h-44 w-44 overflow-hidden rounded-2xl bg-muted">
        {values.imagePath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={values.imagePath}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Kein Bild
          </div>
        )}
      </div>

      <div className="space-y-1.5 text-center">
        <h2 className="font-display text-2xl font-bold leading-snug break-words">
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
        <Button type="button" size="lg" className="w-full" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
          Bearbeiten
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            size="lg"
            variant="outline"
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
  dayTotals,
  mealIsToday,
  onEdit,
}: {
  values: MealFormValues;
  goals: Goals | null;
  dayTotals: Pick<
    NutrientTotals,
    "calories" | "protein" | "carbs" | "fat" | "fiber"
  > | null;
  mealIsToday: boolean;
  onEdit: () => void;
}) {
  const tip = getMealQualityTip(values, goals);
  const ingredients = values.ingredients ?? [];

  const kcalGoal = goals?.dailyCaloriesGoal ?? 0;
  const proteinGoal = goals?.dailyProteinGoal ?? 0;
  const todayKcal = dayTotals?.calories ?? 0;
  const todayProtein = dayTotals?.protein ?? 0;

  const kcalLeft = Math.max(0, kcalGoal - todayKcal);
  const proteinLeft = Math.max(0, proteinGoal - todayProtein);
  const withoutMealKcal = mealIsToday
    ? Math.max(0, todayKcal - values.calories)
    : todayKcal;
  const withoutMealProtein = mealIsToday
    ? Math.max(0, todayProtein - values.protein)
    : todayProtein;

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h2 className="font-display text-xl font-bold">Zutaten & Menge</h2>
        <p className="text-sm text-muted-foreground">
          Portion:{" "}
          <span className="font-medium text-foreground">
            {values.portionSize?.trim() || "unbekannt"}
          </span>
        </p>
        {ingredients.length ? (
          <ul className="divide-y divide-border/70 rounded-2xl border border-border">
            {ingredients.map((item, index) => (
              <li
                key={`${item.name}-${index}`}
                className="flex items-start justify-between gap-3 px-4 py-3 text-sm"
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
          <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            Keine Zutaten hinterlegt.
          </p>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onEdit}
        >
          Menge anpassen
        </Button>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl font-bold">Heute</h2>
        {dayTotals && goals ? (
          <div className="space-y-2 rounded-2xl border border-border p-4 text-sm">
            {mealIsToday ? (
              <>
                <p>
                  Ohne diese Mahlzeit:{" "}
                  <span className="font-medium">
                    {formatNumber(withoutMealKcal, 0)} kcal
                  </span>
                  {" · "}
                  <span className="font-medium">
                    {formatNumber(withoutMealProtein, 0)} g Protein
                  </span>
                </p>
                <p>
                  Inkl. dieser Mahlzeit:{" "}
                  <span className="font-medium">
                    {formatNumber(todayKcal, 0)} /{" "}
                    {formatNumber(kcalGoal, 0)} kcal
                  </span>
                </p>
                <p className="text-muted-foreground">
                  Noch übrig heute: {formatNumber(kcalLeft, 0)} kcal ·{" "}
                  {formatNumber(proteinLeft, 0)} g Protein
                </p>
              </>
            ) : (
              <>
                <p className="text-muted-foreground">
                  Diese Mahlzeit ist von einem anderen Tag.
                </p>
                <p>
                  Heute bisher:{" "}
                  <span className="font-medium">
                    {formatNumber(todayKcal, 0)} /{" "}
                    {formatNumber(kcalGoal, 0)} kcal
                  </span>
                  {" · "}
                  <span className="font-medium">
                    {formatNumber(todayProtein, 0)} g Protein
                  </span>
                </p>
                <p className="text-muted-foreground">
                  Noch übrig heute: {formatNumber(kcalLeft, 0)} kcal ·{" "}
                  {formatNumber(proteinLeft, 0)} g Protein
                </p>
              </>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Tageswerte werden geladen…</p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl font-bold">Coach</h2>
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

function GoalsPage({
  values,
  goals,
}: {
  values: MealFormValues;
  goals: Goals | null;
}) {
  const [more, setMore] = useState(false);

  if (!goals) {
    return (
      <div className="space-y-3">
        <h2 className="font-display text-xl font-bold">Anteil am Tagesziel</h2>
        <p className="text-sm text-muted-foreground">Ziele werden geladen…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold">Anteil am Tagesziel</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Beitrag dieser Mahlzeit zu deinen heutigen Zielen.
        </p>
      </div>
      <div className="space-y-4 rounded-2xl border border-border bg-background p-4">
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
          className="w-full justify-between px-1"
          onClick={() => setMore((value) => !value)}
          aria-expanded={more}
        >
          <span>Weitere Nährstoffe</span>
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", more && "rotate-180")}
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
    </div>
  );
}
