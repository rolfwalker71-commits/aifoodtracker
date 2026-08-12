import { MEAL_TYPE_LABELS } from "@/lib/nutrition";
import { formatNumber } from "@/lib/utils";
import type { NutritionGoals, NutrientTotals } from "@/lib/nutrition";
import type { MealType } from "@/generated/prisma/client";

export type CoachTip = {
  title: string;
  body: string;
  tone: "neutral" | "positive" | "attention";
};

type MealLite = {
  mealType: MealType;
  calories: number;
  protein: number;
  name: string;
};

/** Deterministischer Tages-Coach aus Zielen und bisherigen Einträgen. */
export function getDailyCoachTip(params: {
  totals: NutrientTotals;
  goals: NutritionGoals;
  meals: MealLite[];
  hour?: number;
}): CoachTip {
  const hour =
    typeof params.hour === "number"
      ? params.hour
      : Number(
          new Intl.DateTimeFormat("de-CH", {
            timeZone: "Europe/Zurich",
            hour: "numeric",
            hour12: false,
          }).format(new Date()),
        );

  const { totals, goals, meals } = params;
  const kcalLeft = goals.dailyCaloriesGoal - totals.calories;
  const proteinLeft = goals.dailyProteinGoal - totals.protein;
  const fiberLeft = goals.dailyFiberGoal - totals.fiber;
  const sodiumOver = totals.sodium - goals.dailySodiumGoal;

  if (meals.length === 0) {
    if (hour < 11) {
      return {
        title: "Tagesstart",
        body: "Noch nichts erfasst. Ein Frühstück mit etwas Protein hilft, den Tag stabil zu starten.",
        tone: "neutral",
      };
    }
    return {
      title: "Noch leer",
      body: "Heute noch keine Mahlzeit geloggt. Erfasse den nächsten Happen per Foto oder Freitext.",
      tone: "attention",
    };
  }

  if (sodiumOver > 400) {
    return {
      title: "Natrium im Blick",
      body: `Du liegst etwa ${formatNumber(sodiumOver, 0)} mg über dem Tagesziel. Bei der nächsten Mahlzeit eher frisch und wenig gesalzen wählen.`,
      tone: "attention",
    };
  }

  if (proteinLeft >= 25 && hour >= 15) {
    return {
      title: "Protein-Rest",
      body: `Noch ca. ${formatNumber(proteinLeft, 0)} g Protein bis zum Ziel. Quark, Eier, Fisch oder Hülsenfrüchte schliessen die Lücke gut.`,
      tone: "attention",
    };
  }

  if (kcalLeft < -150) {
    return {
      title: "Über dem Kalorienziel",
      body: `Du bist ca. ${formatNumber(Math.abs(kcalLeft), 0)} kcal über dem Tagesziel. Für den Rest des Tages eher leichte Optionen wählen.`,
      tone: "attention",
    };
  }

  if (fiberLeft >= 8 && hour >= 14) {
    return {
      title: "Ballaststoffe",
      body: `Noch ca. ${formatNumber(fiberLeft, 0)} g Ballaststoffe offen. Gemüse, Beeren oder Vollkorn bringen dich näher ans Ziel.`,
      tone: "neutral",
    };
  }

  if (kcalLeft > 350 && hour >= 18) {
    return {
      title: "Abend-Spielraum",
      body: `Es bleiben etwa ${formatNumber(kcalLeft, 0)} kcal. Ein ausgewogenes Abendessen passt noch gut – Protein nicht vergessen.`,
      tone: "neutral",
    };
  }

  if (kcalLeft >= 0 && proteinLeft <= 15) {
    return {
      title: "Auf Kurs",
      body: `Kalorien und Protein sehen solide aus (${formatNumber(totals.calories)} / ${formatNumber(goals.dailyCaloriesGoal)} kcal). So weiter.`,
      tone: "positive",
    };
  }

  const last = meals[0];
  return {
    title: "Weiter so",
    body: `Zuletzt: ${last.name} (${MEAL_TYPE_LABELS[last.mealType]}). Noch ${formatNumber(Math.max(0, kcalLeft), 0)} kcal und ${formatNumber(Math.max(0, proteinLeft), 0)} g Protein bis zu den Zielen.`,
    tone: "neutral",
  };
}
