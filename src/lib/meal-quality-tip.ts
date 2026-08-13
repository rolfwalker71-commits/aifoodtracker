import type { MealFormValues } from "@/types/meals";
import type { GoalMode } from "@/lib/goal-mode";
import type { NutritionGoals } from "@/lib/nutrition";
import { formatNumber } from "@/lib/utils";

export type MealSwap = {
  /** Kurzer Tausch-Text, z. B. "Süssgetränk → Wasser + Skyr" */
  label: string;
  deltaKcal: number;
  deltaProtein: number;
};

export type MealQualityTip = {
  title: string;
  body: string;
  tone: "positive" | "attention" | "neutral";
  /** @deprecated prefer swaps – kept for simple bullet lists */
  alternatives?: string[];
  swaps?: MealSwap[];
};

function fmtSwap(swap: MealSwap) {
  const kcal =
    swap.deltaKcal === 0
      ? ""
      : swap.deltaKcal > 0
        ? ` (+${formatNumber(swap.deltaKcal, 0)} kcal)`
        : ` (${formatNumber(swap.deltaKcal, 0)} kcal)`;
  const protein =
    swap.deltaProtein === 0
      ? ""
      : swap.deltaProtein > 0
        ? ` (+${formatNumber(swap.deltaProtein, 0)} g Protein)`
        : ` (${formatNumber(swap.deltaProtein, 0)} g Protein)`;
  return `${swap.label}${kcal}${protein}`;
}

/**
 * Rule-based coach for a single meal: praise, warnings, concrete swaps.
 */
export function getMealQualityTip(
  values: MealFormValues,
  goals: NutritionGoals | null,
  goalMode: GoalMode = "MAINTAIN",
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
    const swaps: MealSwap[] = [
      {
        label: "Süsses Dessert → Naturjoghurt mit Beeren",
        deltaKcal: -120,
        deltaProtein: 8,
      },
      {
        label: "Süssgetränk → Wasser/Tee ungesüsst",
        deltaKcal: -90,
        deltaProtein: 0,
      },
      {
        label: "Ganze Portion → Hälfte + Handvoll Nüsse",
        deltaKcal: -80,
        deltaProtein: 3,
      },
    ];
    return {
      title: "Viel Zucker",
      body: `Mit ${formatNumber(values.sugar, 0)} g Zucker ist das eher süss. Passt als Ausnahme – für den Alltag eher weniger.`,
      tone: "attention",
      swaps,
      alternatives: swaps.map(fmtSwap),
    };
  }

  if (values.sodium >= 800 || sodiumShare >= 0.4) {
    const swaps: MealSwap[] = [
      {
        label: "Fertiggericht → frisch mit Kräutern/Zitrone",
        deltaKcal: -40,
        deltaProtein: 0,
      },
      {
        label: "Salzige Sauce → Gemüsebeilage ohne Sauce",
        deltaKcal: -60,
        deltaProtein: 2,
      },
    ];
    return {
      title: "Viel Natrium",
      body: `${formatNumber(values.sodium, 0)} mg Natrium – eher salzig. Achte den Rest des Tages auf unverarbeitete Speisen.`,
      tone: "attention",
      swaps,
      alternatives: swaps.map(fmtSwap),
    };
  }

  if (values.calories >= 350 && proteinPer100kcal < 8) {
    const swaps: MealSwap[] =
      goalMode === "LOSE"
        ? [
            {
              label: "Beilage reduzieren → + Skyr/Hüttenkäse",
              deltaKcal: -90,
              deltaProtein: 15,
            },
            {
              label: "Käsesauce → Tomate + mageres Protein",
              deltaKcal: -110,
              deltaProtein: 12,
            },
            {
              label: "Weissmehl → Hülsenfrüchte/Linsen",
              deltaKcal: -40,
              deltaProtein: 10,
            },
          ]
        : [
            {
              label: "Nur Beilage → + Ei/Tofu/Fisch",
              deltaKcal: 80,
              deltaProtein: 18,
            },
            {
              label: "Brot/Reis allein → + Quark oder Hülsenfrüchte",
              deltaKcal: 60,
              deltaProtein: 14,
            },
            {
              label: "Süsse Beilage → mageres Fleisch/Tofu",
              deltaKcal: 40,
              deltaProtein: 20,
            },
          ];
    return {
      title: "Wenig Protein-Dichte",
      body: `Viel Energie, relativ wenig Protein (${formatNumber(values.protein, 0)} g). Ein Tausch macht die Mahlzeit sättigender${goalMode === "GAIN" ? " und stützt den Muskelaufbau" : ""}.`,
      tone: "attention",
      swaps,
      alternatives: swaps.map(fmtSwap),
    };
  }

  if (values.protein >= 25 || proteinShare >= 0.2) {
    const swaps =
      fiberShare < 0.15
        ? [
            {
              label: "Optional: Gemüse/Vollkorn dazu",
              deltaKcal: 40,
              deltaProtein: 2,
            },
          ]
        : undefined;
    return {
      title: "Starkes Protein",
      body: `${formatNumber(values.protein, 0)} g Protein – gute Wahl für Muskel & Sättigung${goalMode === "GAIN" ? " (passt zum Muskelaufbau)" : goalMode === "LOSE" ? " (hilft beim Abnehmen)" : ""}.`,
      tone: "positive",
      swaps,
      alternatives: swaps?.map(fmtSwap),
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
    swaps:
      goalMode === "GAIN"
        ? [
            {
              label: "Optional: Protein-Topping (+ Skyr/Ei)",
              deltaKcal: 70,
              deltaProtein: 12,
            },
          ]
        : goalMode === "LOSE"
          ? [
              {
                label: "Optional: mehr Gemüse statt Sauce",
                deltaKcal: -50,
                deltaProtein: 1,
              },
            ]
          : undefined,
  };
}
