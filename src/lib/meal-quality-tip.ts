import type { MealFormValues } from "@/types/meals";
import type { NutritionGoals } from "@/lib/nutrition";
import { formatNumber } from "@/lib/utils";

export type MealQualityTip = {
  title: string;
  body: string;
  tone: "positive" | "attention" | "neutral";
  alternatives?: string[];
};

/**
 * Rule-based coach for a single meal: praise, warnings, simple alternatives.
 */
export function getMealQualityTip(
  values: MealFormValues,
  goals: NutritionGoals | null,
): MealQualityTip {
  const sugarGoal = goals?.dailySugarGoal || 50;
  const sodiumGoal = goals?.dailySodiumGoal || 2300;
  const proteinGoal = goals?.dailyProteinGoal || 150;
  const fiberGoal = goals?.dailyFiberGoal || 30;

  const proteinPer100kcal =
    values.calories > 0 ? (values.protein / values.calories) * 100 : 0;

  const sugarShare = values.sugar / sugarGoal;
  const sodiumShare = values.sodium / sodiumGoal;
  const proteinShare = values.protein / proteinGoal;
  const fiberShare = values.fiber / fiberGoal;

  if (values.sugar >= 25 || sugarShare >= 0.35) {
    return {
      title: "Viel Zucker",
      body: `Mit ${formatNumber(values.sugar, 0)} g Zucker ist das eher süss. Passt als Ausnahme – für den Alltag eher weniger.`,
      tone: "attention",
      alternatives: [
        "Naturjoghurt mit Beeren statt süssem Dessert",
        "Ungesüsster Tee / Wasser mit Zitrone",
        "Portion halbieren und mit Nüssen ergänzen",
      ],
    };
  }

  if (values.sodium >= 800 || sodiumShare >= 0.4) {
    return {
      title: "Viel Natrium",
      body: `${formatNumber(values.sodium, 0)} mg Natrium – eher salzig. Achte den Rest des Tages auf unverarbeitete Speisen.`,
      tone: "attention",
      alternatives: [
        "Frisch zubereitet statt Fertiggericht",
        "Mit Kräutern / Zitrone würzen statt Salz",
        "Gemüsebeilage ohne Sauce dazu",
      ],
    };
  }

  if (values.calories >= 350 && proteinPer100kcal < 8) {
    return {
      title: "Wenig Protein-Dichte",
      body: `Viel Energie, relativ wenig Protein (${formatNumber(values.protein, 0)} g). Etwas Eiweiss macht die Mahlzeit sättigender.`,
      tone: "attention",
      alternatives: [
        "Hüttenkäse, Skyr oder Ei dazu",
        "Hülsenfrüchte (Linsen, Kichererbsen)",
        "Mageres Fleisch / Fisch / Tofu ergänzen",
      ],
    };
  }

  if (values.protein >= 25 || proteinShare >= 0.2) {
    return {
      title: "Starkes Protein",
      body: `${formatNumber(values.protein, 0)} g Protein – gute Wahl für Muskel & Sättigung.`,
      tone: "positive",
      alternatives:
        fiberShare < 0.15
          ? ["Optional: Gemüse oder Vollkorn für mehr Ballaststoffe"]
          : undefined,
    };
  }

  if (values.fiber >= 8 || fiberShare >= 0.25) {
    return {
      title: "Gute Ballaststoffe",
      body: `${formatNumber(values.fiber, 1)} g Ballaststoffe – unterstützt Verdauung und hält länger satt.`,
      tone: "positive",
    };
  }

  if (values.calories > 0 && values.calories <= 250 && values.protein >= 12) {
    return {
      title: "Leichter, sinnvoller Imbiss",
      body: "Kompakt und proteinreich – gut als Snack zwischen den Hauptmahlzeiten.",
      tone: "positive",
    };
  }

  return {
    title: "Solide Mahlzeit",
    body: "Keine Auffälligkeiten bei Zucker, Natrium oder Protein-Dichte. Passt in einen ausgewogenen Tag.",
    tone: "neutral",
  };
}
