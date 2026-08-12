"use client";

import { useRef, useState } from "react";
import { motion, type PanInfo } from "framer-motion";
import { Pencil } from "lucide-react";
import { NutrientProgress } from "@/components/dashboard/nutrient-progress";
import { Button } from "@/components/ui/button";
import { formatAppDateTime } from "@/lib/datetime";
import {
  MEAL_TYPE_LABELS,
  NUTRIENT_LABELS,
  type NutritionGoals,
} from "@/lib/nutrition";
import { cn, formatNumber } from "@/lib/utils";
import type { MealFormValues } from "@/types/meals";

type Goals = Pick<
  NutritionGoals,
  | "dailyCaloriesGoal"
  | "dailyProteinGoal"
  | "dailyCarbsGoal"
  | "dailyFatGoal"
  | "dailyFiberGoal"
  | "dailySugarGoal"
  | "dailySodiumGoal"
  | "dailyPotassiumGoal"
>;

type Props = {
  values: MealFormValues;
  goals: Goals | null;
  onEdit: () => void;
};

const PAGE_COUNT = 3;

const DETAIL_ROWS: Array<{
  key: keyof typeof NUTRIENT_LABELS;
  digits: number;
  unit: string;
}> = [
  { key: "calories", digits: 0, unit: "kcal" },
  { key: "protein", digits: 1, unit: "g" },
  { key: "carbs", digits: 1, unit: "g" },
  { key: "fat", digits: 1, unit: "g" },
  { key: "fiber", digits: 1, unit: "g" },
  { key: "sugar", digits: 1, unit: "g" },
  { key: "saturatedFat", digits: 1, unit: "g" },
  { key: "sodium", digits: 0, unit: "mg" },
  { key: "potassium", digits: 0, unit: "mg" },
  { key: "vitaminA", digits: 0, unit: "µg" },
  { key: "vitaminC", digits: 1, unit: "mg" },
  { key: "vitaminD", digits: 2, unit: "mg" },
  { key: "calcium", digits: 0, unit: "mg" },
  { key: "iron", digits: 2, unit: "mg" },
];

export function MealDetailViewer({ values, goals, onEdit }: Props) {
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

  const ingredients = (values.ingredients ?? [])
    .map((part) =>
      part.portionSize ? `${part.name} (${part.portionSize})` : part.name,
    )
    .join(" · ");

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
              ingredients={ingredients}
              onEdit={onEdit}
            />
          </section>
          <section className="box-border w-full min-w-full shrink-0 touch-pan-y px-4 py-5">
            <NutrientsPage values={values} />
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
        {page === 0
          ? "Überblick"
          : page === 1
            ? "Alle Nährwerte"
            : "Anteil am Tagesziel"}{" "}
        · wischen
      </p>
    </div>
  );
}

function OverviewPage({
  values,
  ingredients,
  onEdit,
}: {
  values: MealFormValues;
  ingredients: string;
  onEdit: () => void;
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
        {ingredients ? (
          <p className="pt-1 text-sm text-muted-foreground">{ingredients}</p>
        ) : null}
        {values.notes?.trim() ? (
          <p className="text-sm text-muted-foreground">{values.notes.trim()}</p>
        ) : null}
      </div>

      <Button type="button" size="lg" className="w-full" onClick={onEdit}>
        <Pencil className="h-4 w-4" />
        Bearbeiten
      </Button>
    </div>
  );
}

function NutrientsPage({ values }: { values: MealFormValues }) {
  return (
    <div className="space-y-3">
      <h2 className="font-display text-xl font-bold">Alle Nährwerte</h2>
      <p className="text-sm text-muted-foreground">
        Werte für diese Mahlzeit ({values.portionSize?.trim() || "Portion"}).
      </p>
      <ul className="divide-y divide-border/70 rounded-2xl border border-border bg-background">
        {DETAIL_ROWS.map((row) => (
          <li
            key={row.key}
            className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
          >
            <span className="font-medium">{NUTRIENT_LABELS[row.key]}</span>
            <span className="tabular-nums text-muted-foreground">
              {formatNumber(values[row.key], row.digits)}
              {row.unit === "kcal" ? " kcal" : ` ${row.unit}`}
            </span>
          </li>
        ))}
      </ul>
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
      </div>
    </div>
  );
}
