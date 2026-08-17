"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { NutrientProgress } from "@/components/dashboard/nutrient-progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NutrientTotals, NutritionGoals } from "@/lib/nutrition";

type Props = {
  totals: NutrientTotals;
  goals: NutritionGoals;
  profileComplete: boolean;
};

export function DailyGoalsSummary({ totals, goals, profileComplete }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      {!profileComplete && (
        <p className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning-foreground">
          Für eine persönliche Kalorienberechnung bitte unter{" "}
          <Link href="/settings" className="font-semibold underline">
            Benutzer
          </Link>{" "}
          Geschlecht, Grösse, Gewicht und Geburtsjahr hinterlegen.
        </p>
      )}

      <NutrientProgress
        label="Kalorien"
        current={totals.calories}
        goal={goals.dailyCaloriesGoal}
        unit="kcal"
      />
      <NutrientProgress
        label="Protein"
        current={totals.protein}
        goal={goals.dailyProteinGoal}
            colorClass="bg-chart-2"
      />
      <NutrientProgress
        label="Kohlenhydrate"
        current={totals.carbs}
        goal={goals.dailyCarbsGoal}
            colorClass="bg-chart-3"
      />
      <NutrientProgress
        label="Fett"
        current={totals.fat}
        goal={goals.dailyFatGoal}
            colorClass="bg-chart-4"
      />
      <NutrientProgress
        label="Ballaststoffe"
        current={totals.fiber}
        goal={goals.dailyFiberGoal}
            colorClass="bg-chart-5"
      />

      <div className="space-y-3 border-t border-border/60 pt-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full justify-between px-1"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          <span>Weitere Nährstoffe</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              open && "rotate-180",
            )}
          />
        </Button>

        {open ? (
          <div className="space-y-4">
            <NutrientProgress
              label="Zucker"
              current={totals.sugar}
              goal={goals.dailySugarGoal}
              colorClass="bg-chart-3"
            />
            <NutrientProgress
              label="Natrium"
              current={totals.sodium}
              goal={goals.dailySodiumGoal}
              unit="mg"
              colorClass="bg-chart-5"
            />
            <NutrientProgress
              label="Kalium"
              current={totals.potassium}
              goal={goals.dailyPotassiumGoal}
              unit="mg"
              colorClass="bg-chart-2"
            />
            <NutrientProgress
              label="Vitamin A"
              current={totals.vitaminA}
              goal={goals.dailyVitaminAGoal}
              unit="µg"
              colorClass="bg-chart-4"
            />
            <NutrientProgress
              label="Vitamin C"
              current={totals.vitaminC}
              goal={goals.dailyVitaminCGoal}
              unit="mg"
              colorClass="bg-chart-1"
            />
            <NutrientProgress
              label="Vitamin D"
              current={totals.vitaminD}
              goal={goals.dailyVitaminDGoal}
              unit="µg"
              colorClass="bg-chart-4"
            />
            <NutrientProgress
              label="Kalzium"
              current={totals.calcium}
              goal={goals.dailyCalciumGoal}
              unit="mg"
              colorClass="bg-muted-foreground"
            />
            <NutrientProgress
              label="Eisen"
              current={totals.iron}
              goal={goals.dailyIronGoal}
              unit="mg"
              colorClass="bg-destructive"
            />
            <p className="text-xs text-muted-foreground">
              Verlauf und Tagesvergleiche findest du unter{" "}
              <Link href="/stats" className="font-medium underline underline-offset-2">
                Statistiken
              </Link>
              .
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
