"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { animate, motion, useMotionValue } from "framer-motion";
import { ChevronDown, CopyPlus, Pencil, Star, X } from "lucide-react";
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
  onClose: () => void;
  onEdit: () => void;
  onToggleFavorite: () => void;
  onDuplicate: () => void;
};

const PAGE_COUNT = 3;
const PAGE_LABELS = ["Überblick", "Zutaten & Coach", "Heute & Ziele"] as const;
const AXIS_LOCK_PX = 10;
const SWIPE_RATIO = 0.18;

export function MealDetailViewer({
  values,
  goals,
  dayTotals,
  mealIsToday,
  isFavorite,
  busy,
  onClose,
  onEdit,
  onToggleFavorite,
  onDuplicate,
}: Props) {
  const [mounted, setMounted] = useState(false);
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

  useEffect(() => {
    setMounted(true);
  }, []);

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
  }, [x, mounted]);

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

  if (!mounted) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-x-0 z-40 flex flex-col",
        "top-14 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))]",
        "md:inset-0 md:z-50 md:items-center md:justify-center md:bg-black/45 md:p-6 md:backdrop-blur-[2px]",
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Mahlzeit-Details"
    >
      <div
        className={cn(
          "flex h-full min-h-0 w-full flex-col overflow-hidden bg-background",
          "md:h-[min(88vh,52rem)] md:max-w-2xl md:rounded-2xl md:border md:border-border md:shadow-2xl",
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/70 px-4 py-3">
          <div className="min-w-0">
            <h1 className="font-display text-lg font-bold tracking-tight md:text-xl">
              Mahlzeit
            </h1>
            <p className="truncate text-xs text-muted-foreground">
              {PAGE_LABELS[page]} · wischen
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0"
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
              <InsightPage values={values} goals={goals} onEdit={onEdit} />
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

        <div className="flex shrink-0 flex-col items-center gap-1 border-t border-border/70 px-4 py-2.5">
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
            {PAGE_LABELS[page]}
          </p>
        </div>
      </div>
    </div>,
    document.body,
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
          <ul className="max-h-[38vh] divide-y divide-border/70 overflow-y-auto rounded-2xl border border-border sm:max-h-[42vh]">
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
          Menge anpassen
        </Button>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-lg font-bold">Coach</h2>
        <div
          className={cn(
            "rounded-2xl border p-3.5",
            tip.tone === "positive" &&
              "border-emerald-600/30 bg-emerald-500/10",
            tip.tone === "attention" && "border-amber-600/30 bg-amber-500/10",
            tip.tone === "neutral" && "border-border bg-background",
          )}
        >
          <p className="text-sm font-semibold">{tip.title}</p>
          <p className="mt-1 text-sm leading-snug text-muted-foreground">
            {tip.body}
          </p>
          {tip.alternatives?.length ? (
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
