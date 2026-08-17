"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { animate, motion, useMotionValue } from "framer-motion";
import { ChevronDown, CopyPlus, Pencil, Star, X } from "lucide-react";
import { NutrientProgress } from "@/components/dashboard/nutrient-progress";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
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
  goalMode?: "LOSE" | "MAINTAIN" | "GAIN";
  onClose: () => void;
  onEdit: () => void;
  onToggleFavorite: () => void;
  onDuplicate: () => void;
};

const PAGE_COUNT = 3;
const PAGE_LABELS = ["Überblick", "Zutaten", "Ziele"] as const;
const AXIS_LOCK_PX = 10;
const SWIPE_RATIO = 0.18;

export function MealDetailViewer({
  values,
  goals,
  dayTotals,
  mealIsToday,
  isFavorite,
  busy,
  goalMode = "MAINTAIN",
  onClose,
  onEdit,
  onToggleFavorite,
  onDuplicate,
}: Props) {
  const [page, setPage] = useState(0);
  const [width, setWidth] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Array<HTMLElement | null>>([]);
  const x = useMotionValue(0);
  const dragOffset = useRef(0);
  const gesture = useRef<{
    id: number;
    x0: number;
    y0: number;
    axis: "x" | "y" | null;
  } | null>(null);
  const pageRef = useRef(page);
  pageRef.current = page;

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      setWidth(w);
      if (!gesture.current || gesture.current.axis !== "x") {
        x.set(-pageRef.current * w);
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [x]);

  useEffect(() => {
    if (!width) return;
    if (gesture.current?.axis === "x") return;
    const controls = animate(x, -page * width, {
      type: "spring",
      stiffness: 420,
      damping: 38,
      mass: 0.7,
    });
    return () => controls.stop();
  }, [page, width, x]);

  useEffect(() => {
    pageRefs.current[page]?.scrollTo({ top: 0 });
  }, [page]);

  function goTo(index: number) {
    setPage(Math.min(PAGE_COUNT - 1, Math.max(0, index)));
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, textarea, select, label")) return;
    gesture.current = {
      id: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      axis: null,
    };
    dragOffset.current = 0;
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX - g.x0;
    const dy = e.clientY - g.y0;
    const current = pageRef.current;
    const w = width || viewportRef.current?.clientWidth || 1;

    if (!g.axis) {
      if (Math.hypot(dx, dy) < AXIS_LOCK_PX) return;
      g.axis = Math.abs(dx) > Math.abs(dy) * 1.05 ? "x" : "y";
      if (g.axis === "y") {
        gesture.current = null;
        return;
      }
      e.currentTarget.setPointerCapture(e.pointerId);
    }

    if (g.axis !== "x") return;
    e.preventDefault();
    let next = dx;
    if (current === 0 && next > 0) next *= 0.35;
    if (current >= PAGE_COUNT - 1 && next < 0) next *= 0.35;
    dragOffset.current = next;
    x.set(-current * w + next);
  }

  function endGesture(e: ReactPointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    const current = pageRef.current;
    const w = width || viewportRef.current?.clientWidth || 320;
    const threshold = Math.min(64, w * SWIPE_RATIO);

    if (g.axis === "x") {
      const dx = dragOffset.current;
      if (dx < -threshold) goTo(current + 1);
      else if (dx > threshold) goTo(current - 1);
      else {
        animate(x, -current * w, {
          type: "spring",
          stiffness: 420,
          damping: 38,
        });
      }
    }

    dragOffset.current = 0;
    gesture.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        showClose={false}
        className={cn(
          "flex h-dvh max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 p-0 left-0 top-0",
          "md:left-1/2 md:top-1/2 md:h-[90vh] md:max-w-2xl md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:border md:border-border md:shadow-2xl",
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <DialogTitle className="md:text-xl">Mahlzeit</DialogTitle>
            <DialogDescription className="truncate">
              {PAGE_LABELS[page]}
            </DialogDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            aria-label="Schliessen"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div
          ref={viewportRef}
          className="relative min-h-0 flex-1 overflow-hidden touch-pan-y"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endGesture}
          onPointerCancel={endGesture}
        >
          <motion.div
            className="flex h-full min-h-0 will-change-transform"
            style={{
              x,
              width: width > 0 ? width * PAGE_COUNT : "300%",
            }}
          >
            <section
              ref={(node) => {
                pageRefs.current[0] = node;
              }}
              className="h-full min-h-0 shrink-0 overflow-y-auto overscroll-y-contain px-4 py-3"
              style={{ width: width > 0 ? width : "33.333%" }}
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
              className="h-full min-h-0 shrink-0 overflow-y-auto overscroll-y-contain px-4 py-3"
              style={{ width: width > 0 ? width : "33.333%" }}
            >
              <InsightPage
                values={values}
                goals={goals}
                goalMode={goalMode}
                onEdit={onEdit}
              />
            </section>
            <section
              ref={(node) => {
                pageRefs.current[2] = node;
              }}
              className="h-full min-h-0 shrink-0 overflow-y-auto overscroll-y-contain px-4 py-3"
              style={{ width: width > 0 ? width : "33.333%" }}
            >
              <GoalsPage
                values={values}
                goals={goals}
                dayTotals={dayTotals}
                mealIsToday={mealIsToday}
              />
            </section>
          </motion.div>
        </div>

        <div
          role="tablist"
          aria-label="Detail-Bereiche"
          className="grid shrink-0 grid-cols-3 gap-1 border-t border-border/70 p-2"
        >
          {PAGE_LABELS.map((label, index) => (
            <Button
              key={label}
              type="button"
              role="tab"
              variant={index === page ? "default" : "secondary"}
              aria-selected={index === page}
              className="h-11 px-2 text-xs sm:text-sm"
              onClick={() => goTo(index)}
            >
              {label}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
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
    <div className="mx-auto flex w-full max-w-md flex-col justify-center gap-3 py-1">
      <div className="mx-auto h-28 w-28 overflow-hidden rounded-2xl bg-muted sm:h-36 sm:w-36">
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

      <div className="space-y-1 text-center">
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
        <p className="text-sm font-medium sm:text-base">
          {formatNumber(values.calories, 0)} kcal · P{" "}
          {formatNumber(values.protein, 0)}g · K {formatNumber(values.carbs, 0)}
          g · F {formatNumber(values.fat, 0)}g
        </p>
        {values.notes?.trim() ? (
          <p className="line-clamp-3 text-sm text-muted-foreground">
            {values.notes.trim()}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2 pt-1">
        <Button type="button" size="lg" className="h-11 w-full" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
          Bearbeiten
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="h-11"
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
            className="h-11"
            disabled={busy}
            onClick={onToggleFavorite}
          >
            <Star
              className={cn(
                "h-4 w-4",
                isFavorite && "fill-primary text-primary",
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
  goalMode = "MAINTAIN",
  onEdit,
}: {
  values: MealFormValues;
  goals: Goals | null;
  goalMode?: "LOSE" | "MAINTAIN" | "GAIN";
  onEdit: () => void;
}) {
  const tip = getMealQualityTip(values, goals, goalMode);
  const ingredients = values.ingredients ?? [];

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3">
      <section className="space-y-2">
        <div>
          <h2 className="font-display text-lg font-bold">Zutaten & Menge</h2>
          <p className="text-sm text-muted-foreground">
            Portion:{" "}
            <span className="font-medium text-foreground">
              {values.portionSize?.trim() || "unbekannt"}
            </span>
          </p>
        </div>
        {ingredients.length ? (
          <ul className="max-h-80 divide-y divide-border overflow-y-auto rounded-2xl border border-border sm:max-h-96">
            {ingredients.map((item, index) => (
              <li
                key={`${item.name}-${index}`}
                className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm"
              >
                <span className="min-w-0 break-words font-medium leading-snug">
                  {item.name}
                </span>
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
          className="h-10 w-full"
          onClick={onEdit}
        >
          Zutaten & Menge anpassen
        </Button>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-lg font-bold">Coach</h2>
        <div
          className={cn(
            "rounded-2xl border p-3.5",
            tip.tone === "positive" && "border-primary/30 bg-primary/10",
            tip.tone === "attention" &&
              "border-warning/40 bg-warning/10 text-warning-foreground",
            tip.tone === "neutral" && "border-border bg-background",
          )}
        >
          <p className="text-sm font-semibold">{tip.title}</p>
          <p className="mt-1 text-sm leading-snug text-muted-foreground">
            {tip.body}
          </p>
          {tip.swaps?.length ? (
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              {tip.swaps.map((swap) => (
                <li key={swap.label} className="leading-snug">
                  <span className="font-medium text-foreground">
                    {swap.label}
                  </span>
                  <span className="tabular-nums">
                    {swap.deltaKcal !== 0
                      ? ` · ${swap.deltaKcal > 0 ? "+" : ""}${formatNumber(swap.deltaKcal, 0)} kcal`
                      : ""}
                    {swap.deltaProtein !== 0
                      ? ` · ${swap.deltaProtein > 0 ? "+" : ""}${formatNumber(swap.deltaProtein, 0)} g Protein`
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : tip.alternatives?.length ? (
            <ul className="mt-2 list-disc space-y-0.5 pl-4 text-sm text-muted-foreground">
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
    <div className="grid gap-2 rounded-2xl border border-border bg-background p-2.5 text-sm sm:grid-cols-3 sm:p-3">
      {mealIsToday ? (
        <>
          <div className="space-y-0.5 rounded-xl bg-muted/40 px-3 py-2.5">
            <p className="text-xs text-muted-foreground">Ohne diese Mahlzeit</p>
            <p className="font-semibold tabular-nums">
              {formatNumber(withoutMealKcal, 0)} kcal
            </p>
            <p className="text-muted-foreground tabular-nums">
              {formatNumber(withoutMealProtein, 0)} g Protein
            </p>
          </div>
          <div className="space-y-0.5 rounded-xl bg-muted/40 px-3 py-2.5">
            <p className="text-xs text-muted-foreground">Inkl. dieser Mahlzeit</p>
            <p className="font-semibold tabular-nums">
              {formatNumber(todayKcal, 0)} / {formatNumber(kcalGoal, 0)} kcal
            </p>
            <p className="text-muted-foreground tabular-nums">
              {formatNumber(todayProtein, 0)} / {formatNumber(proteinGoal, 0)} g
              Protein
            </p>
          </div>
          <div className="space-y-0.5 rounded-xl bg-primary/10 px-3 py-2.5">
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
          <div className="space-y-0.5 rounded-xl bg-muted/40 px-3 py-2.5 sm:col-span-2">
            <p className="text-xs text-muted-foreground">
              Anderer Tag · Heute bisher
            </p>
            <p className="font-semibold tabular-nums">
              {formatNumber(todayKcal, 0)} / {formatNumber(kcalGoal, 0)} kcal
            </p>
            <p className="text-muted-foreground tabular-nums">
              {formatNumber(todayProtein, 0)} g Protein
            </p>
          </div>
          <div className="space-y-0.5 rounded-xl bg-primary/10 px-3 py-2.5">
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
      <div className="mx-auto flex w-full max-w-md flex-col gap-3">
        <h2 className="font-display text-lg font-bold">Heute & Ziele</h2>
        <p className="text-sm text-muted-foreground">Ziele werden geladen…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3">
      <section className="space-y-2">
        <h2 className="font-display text-lg font-bold">Heute</h2>
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

      <section className="space-y-2">
        <div>
          <h2 className="font-display text-lg font-bold">Anteil am Tagesziel</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Beitrag dieser Mahlzeit zu deinen heutigen Zielen.
          </p>
        </div>
        <div className="space-y-3 rounded-2xl border border-border bg-background p-3.5">
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
            colorClass="bg-chart-2"
          />
          <NutrientProgress
            label="Kohlenhydrate"
            current={values.carbs}
            goal={goals.dailyCarbsGoal}
            colorClass="bg-chart-3"
          />
          <NutrientProgress
            label="Fett"
            current={values.fat}
            goal={goals.dailyFatGoal}
            colorClass="bg-chart-4"
          />
          <NutrientProgress
            label="Ballaststoffe"
            current={values.fiber}
            goal={goals.dailyFiberGoal}
            colorClass="bg-chart-5"
          />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-10 w-full justify-between px-1"
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
            <div className="space-y-3">
              <NutrientProgress
                label="Zucker"
                current={values.sugar}
                goal={goals.dailySugarGoal}
                colorClass="bg-chart-3"
              />
              <NutrientProgress
                label="Natrium"
                current={values.sodium}
                goal={goals.dailySodiumGoal}
                unit="mg"
                colorClass="bg-chart-5"
              />
              <NutrientProgress
                label="Kalium"
                current={values.potassium}
                goal={goals.dailyPotassiumGoal}
                unit="mg"
                colorClass="bg-chart-2"
              />
              <NutrientProgress
                label="Vitamin A"
                current={values.vitaminA}
                goal={goals.dailyVitaminAGoal}
                unit="µg"
                colorClass="bg-chart-4"
              />
              <NutrientProgress
                label="Vitamin C"
                current={values.vitaminC}
                goal={goals.dailyVitaminCGoal}
                unit="mg"
                colorClass="bg-chart-1"
              />
              <NutrientProgress
                label="Vitamin D"
                current={values.vitaminD}
                goal={goals.dailyVitaminDGoal}
                unit="µg"
                colorClass="bg-chart-4"
              />
              <NutrientProgress
                label="Kalzium"
                current={values.calcium}
                goal={goals.dailyCalciumGoal}
                unit="mg"
                colorClass="bg-muted-foreground"
              />
              <NutrientProgress
                label="Eisen"
                current={values.iron}
                goal={goals.dailyIronGoal}
                unit="mg"
                colorClass="bg-destructive"
              />
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
