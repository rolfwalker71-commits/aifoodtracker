import type { GoalMode } from "@/lib/goal-mode";
import type { NutrientTotals, NutritionGoals } from "@/lib/nutrition";
import { formatNumber } from "@/lib/utils";

export type DayPlanSuggestion = {
  title: string;
  body: string;
  ideas: string[];
};

export type DayRestBudget = {
  kcalLeft: number;
  proteinLeft: number;
  fiberLeft: number;
  overKcal: boolean;
  suggestion: DayPlanSuggestion;
};

/** Restbudget und konkreter Abend-/Rest-Vorschlag aus heutigen Totals. */
export function getDayRestBudget(params: {
  totals: NutrientTotals;
  goals: NutritionGoals;
  goalMode?: GoalMode;
  hour?: number;
}): DayRestBudget {
  const mode = params.goalMode ?? "MAINTAIN";
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

  const kcalLeft = params.goals.dailyCaloriesGoal - params.totals.calories;
  const proteinLeft = params.goals.dailyProteinGoal - params.totals.protein;
  const fiberLeft = params.goals.dailyFiberGoal - params.totals.fiber;
  const overKcal = kcalLeft < -80;

  const suggestion = buildSuggestion({
    mode,
    hour,
    kcalLeft,
    proteinLeft,
    fiberLeft,
    overKcal,
  });

  return {
    kcalLeft,
    proteinLeft,
    fiberLeft,
    overKcal,
    suggestion,
  };
}

function buildSuggestion(params: {
  mode: GoalMode;
  hour: number;
  kcalLeft: number;
  proteinLeft: number;
  fiberLeft: number;
  overKcal: boolean;
}): DayPlanSuggestion {
  const { mode, hour, kcalLeft, proteinLeft, fiberLeft, overKcal } = params;
  const mealLabel = hour < 11 ? "nächste Mahlzeit" : hour < 15 ? "Mittagessen" : "Abendessen";

  if (overKcal) {
    return {
      title: `Leichte ${mealLabel}`,
      body: `Du bist ca. ${formatNumber(Math.abs(kcalLeft), 0)} kcal über dem Tagesziel. Für den Rest eher proteinreich und kalorienarm.`,
      ideas:
        mode === "GAIN"
          ? [
              "Skyr/Quark mit Beeren (viel Protein, wenig Extra-kcal)",
              "Omlett mit Gemüse, ohne schwere Beilage",
              "Gegrilltes Fleisch/Tofu + grosser Salat",
            ]
          : [
              "Gemüsepfanne mit Ei oder Tofu",
              "Grosse Salatschüssel mit Hähnchen/Thunfisch",
              "Klare Suppe + proteinreicher Topping",
            ],
    };
  }

  if (proteinLeft >= 30) {
    const kcalHint =
      kcalLeft > 0
        ? `Noch ca. ${formatNumber(kcalLeft, 0)} kcal und ${formatNumber(proteinLeft, 0)} g Protein.`
        : `Noch ca. ${formatNumber(proteinLeft, 0)} g Protein – Energie eher schon ausgeschöpft.`;
    return {
      title: `Protein fürs ${mealLabel}`,
      body: kcalHint,
      ideas:
        mode === "LOSE"
          ? [
              `Magerquark/Skyr (~150 g) + Beeren`,
              `Fischfilet oder Hähnchenbrust + Gemüse (Ziel: ~${formatNumber(Math.min(kcalLeft > 0 ? kcalLeft : 350, 450), 0)} kcal)`,
              "Linsensalat mit Ei",
            ]
          : mode === "GAIN"
            ? [
                "Reis/Kartoffel + Fleisch/Fisch + Gemüse",
                "Haferflocken mit Milch + Proteinpulver/Quark",
                "Pasta mit Thunfisch und Olivenöl",
              ]
            : [
                "Ausgewogener Teller: Protein + Gemüse + komplexe Kohlenhydrate",
                "Buddha-Bowl mit Hülsenfrüchten",
                "Vollkornbrot mit Ei/Käse und Rohkost",
              ],
    };
  }

  if (fiberLeft >= 10 && hour >= 12) {
    return {
      title: "Ballaststoffe nachziehen",
      body: `Noch ca. ${formatNumber(fiberLeft, 0)} g Ballaststoffe. Gut für Sättigung${mode === "LOSE" ? " und Abnehmen" : ""}.`,
      ideas: [
        "Gemüsebeilage oder grosser Salat",
        "Beeren, Apfel oder Birne",
        "Vollkorn statt Weissmehl",
      ],
    };
  }

  if (kcalLeft >= 250) {
    return {
      title: `Spielraum fürs ${mealLabel}`,
      body: `Es bleiben etwa ${formatNumber(kcalLeft, 0)} kcal und ${formatNumber(Math.max(0, proteinLeft), 0)} g Protein.`,
      ideas:
        mode === "GAIN"
          ? [
              "Vollwertige Mahlzeit mit Extra-Kohlenhydraten",
              "Nussige Beilage oder Avocado für Energie",
              "Proteinshake als Ergänzung, nicht als Ersatz",
            ]
          : [
              "Teller-Regel: ½ Gemüse, ¼ Protein, ¼ Beilage",
              "Sättigend kochen, nicht nur „noch schnell etwas“",
              "Wasser/ungesüssten Tee dazu",
            ],
    };
  }

  return {
    title: "Tag im Rahmen",
    body: `Rest ca. ${formatNumber(Math.max(0, kcalLeft), 0)} kcal · ${formatNumber(Math.max(0, proteinLeft), 0)} g Protein.`,
    ideas: [
      "Leichter Snack reicht oft",
      "Auf Hunger hören – nicht zwingend auffüllen",
      "Morgen weiter sauber loggen",
    ],
  };
}
