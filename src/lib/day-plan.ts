import type { GoalMode } from "@/lib/goal-mode";
import type { NutrientTotals, NutritionGoals } from "@/lib/nutrition";
import { formatNumber } from "@/lib/utils";

export type DayPlanIdea = {
  /** Gericht / Snack */
  name: string;
  /** Portion / Menge */
  amount: string;
  kcal: number;
  /** Kohlenhydrate in g */
  carbs: number;
};

export type DayPlanSuggestion = {
  title: string;
  body: string;
  mealLabel: string;
  ideas: DayPlanIdea[];
};

export type DayRestBudget = {
  kcalLeft: number;
  proteinLeft: number;
  fiberLeft: number;
  carbsLeft: number;
  overKcal: boolean;
  suggestion: DayPlanSuggestion;
};

type MealSlot = "breakfast" | "lunch" | "snack" | "dinner";

type CatalogItem = {
  name: string;
  /** Basis-Portionsangabe */
  amount: string;
  kcal: number;
  carbs: number;
};

const BREAKFAST: CatalogItem[] = [
  {
    name: "Butterzopf oder Gipfeli mit Butter und Konfitüre",
    amount: "1 Stück + Belag",
    kcal: 420,
    carbs: 48,
  },
  {
    name: "Brot mit Butter, Käse und Aufschnitt",
    amount: "2 Scheiben (~120 g Brot)",
    kcal: 480,
    carbs: 42,
  },
  {
    name: "Rührei mit Speck und Toast",
    amount: "2 Eier + 2 Scheiben Toast",
    kcal: 520,
    carbs: 28,
  },
  {
    name: "Birchermüesli mit Vollmilch und Apfel",
    amount: "1 grosse Schale (~350 g)",
    kcal: 450,
    carbs: 55,
  },
  {
    name: "Brotzeit: Wurstsalat-ähnlich – Käse, Landjäger, Brot",
    amount: "1 Teller",
    kcal: 560,
    carbs: 35,
  },
  {
    name: "Haferflocken mit Milch, Zucker und Banane",
    amount: "60 g Flocken + 2 dl Milch",
    kcal: 430,
    carbs: 62,
  },
];

const LUNCH: CatalogItem[] = [
  {
    name: "Geschnetzeltes mit Rösti und Sauce",
    amount: "1 Portion (~400 g)",
    kcal: 720,
    carbs: 48,
  },
  {
    name: "Schnitzel mit Pommes und Salat",
    amount: "1 Schnitzel + 150 g Pommes",
    kcal: 780,
    carbs: 55,
  },
  {
    name: "Bratwurst mit Zwiebelsauce und Kartoffelstock",
    amount: "1–2 Würste + Beilage",
    kcal: 690,
    carbs: 40,
  },
  {
    name: "Älplermagronen mit Apfelmus",
    amount: "1 Teller (~350 g)",
    kcal: 740,
    carbs: 70,
  },
  {
    name: "Pastetli mit Ragout und Blätterteig",
    amount: "1 Pastetli",
    kcal: 650,
    carbs: 42,
  },
  {
    name: "Spaghetti Bolognese mit Parmesan",
    amount: "1 Teller (~320 g Pasta gekocht)",
    kcal: 680,
    carbs: 72,
  },
  {
    name: "Cordón bleu mit Reis und Gemüse",
    amount: "1 Stück + Beilage",
    kcal: 710,
    carbs: 45,
  },
];

const SNACK: CatalogItem[] = [
  {
    name: "Butterbrot mit Käse oder Aufschnitt",
    amount: "1–2 Scheiben",
    kcal: 320,
    carbs: 28,
  },
  {
    name: "Nussgipfel oder Weggli mit Butter",
    amount: "1 Stück",
    kcal: 280,
    carbs: 32,
  },
  {
    name: "Joghurt natur mit Müesli und Honig",
    amount: "180 g + 30 g Müesli",
    kcal: 310,
    carbs: 38,
  },
  {
    name: "Würstchen mit Senf und Brot",
    amount: "1 Wiener + 1 Scheibe",
    kcal: 340,
    carbs: 22,
  },
];

const DINNER: CatalogItem[] = [
  {
    name: "Fleischkäse mit Senf, Brot und Gurke",
    amount: "120 g Fleischkäse + 2 Scheiben Brot",
    kcal: 520,
    carbs: 36,
  },
  {
    name: "Rösti mit Spiegelei und Speck",
    amount: "1 Portion (~300 g)",
    kcal: 610,
    carbs: 42,
  },
  {
    name: "Käseschnitte oder Toast Hawaii",
    amount: "2 Scheiben",
    kcal: 480,
    carbs: 38,
  },
  {
    name: "Hackbraten mit Kartoffeln und Sauce",
    amount: "1 Portion",
    kcal: 640,
    carbs: 40,
  },
  {
    name: "Teigwaren mit Rahmsauce und Schinken",
    amount: "1 Teller (~280 g)",
    kcal: 590,
    carbs: 58,
  },
  {
    name: "Fischstäbchen mit Kartoffelsalat",
    amount: "4–5 Stück + Beilage",
    kcal: 550,
    carbs: 48,
  },
  {
    name: "Suppe (z. B. Erbsen) mit Würfelbrot und Käse",
    amount: "1 Teller + Beilage",
    kcal: 420,
    carbs: 45,
  },
];

const LIGHT: CatalogItem[] = [
  {
    name: "Klare Bouillon mit Nudeln und Brot",
    amount: "1 Tasse + 1 Scheibe",
    kcal: 220,
    carbs: 28,
  },
  {
    name: "Brot mit Aufschnitt, ohne Extra-Sauce",
    amount: "1 Scheibe",
    kcal: 190,
    carbs: 18,
  },
  {
    name: "Naturjoghurt mit wenig Zucker",
    amount: "180 g",
    kcal: 160,
    carbs: 18,
  },
  {
    name: "Gebratene Eier mit Gemüse, wenig Öl",
    amount: "2 Eier + Beilage",
    kcal: 280,
    carbs: 8,
  },
  {
    name: "Kleine Rösti-Portion ohne Speck",
    amount: "~150 g",
    kcal: 260,
    carbs: 28,
  },
];

const SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: "Frühstück",
  lunch: "Mittagessen",
  snack: "Zwischenmahlzeit",
  dinner: "Abendessen",
};

/** Restbudget und konkrete Hausmannskost-Vorschläge nach Tageszeit. */
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
  const carbsLeft = params.goals.dailyCarbsGoal - params.totals.carbs;
  const overKcal = kcalLeft < -80;

  const suggestion = buildSuggestion({
    mode,
    hour,
    kcalLeft,
    proteinLeft,
    carbsLeft,
    overKcal,
    eatenKcal: params.totals.calories,
    dailyGoal: params.goals.dailyCaloriesGoal,
  });

  return {
    kcalLeft,
    proteinLeft,
    fiberLeft,
    carbsLeft,
    overKcal,
    suggestion,
  };
}

function mealSlotFromHour(hour: number): MealSlot {
  if (hour < 10) return "breakfast";
  if (hour < 14) return "lunch";
  if (hour < 17) return "snack";
  return "dinner";
}

function catalogFor(slot: MealSlot, overKcal: boolean): CatalogItem[] {
  if (overKcal) return LIGHT;
  switch (slot) {
    case "breakfast":
      return BREAKFAST;
    case "lunch":
      return LUNCH;
    case "snack":
      return SNACK;
    case "dinner":
      return DINNER;
  }
}

/** Ziel-kcal für die nächste Mahlzeit – später am Tag stärker am Restbudget. */
function targetKcalForSlot(params: {
  slot: MealSlot;
  kcalLeft: number;
  overKcal: boolean;
  eatenKcal: number;
  dailyGoal: number;
  mode: GoalMode;
}): number {
  const { slot, kcalLeft, overKcal, eatenKcal, dailyGoal, mode } = params;
  if (overKcal) {
    return Math.min(280, Math.max(150, 220));
  }

  const remaining = Math.max(0, kcalLeft);
  const dayProgress = dailyGoal > 0 ? eatenKcal / dailyGoal : 0;

  // Früher am Tag: typische Portionsgrösse, nicht den ganzen Tagesrest auffressen
  const typical: Record<MealSlot, { min: number; max: number }> = {
    breakfast: { min: 350, max: mode === "GAIN" ? 650 : 550 },
    lunch: { min: 500, max: mode === "GAIN" ? 900 : 780 },
    snack: { min: 180, max: 380 },
    dinner: { min: 400, max: mode === "GAIN" ? 850 : 700 },
  };

  const band = typical[slot];

  // Ab Mittag stärker am Rest orientieren
  if (slot === "dinner" || (slot === "snack" && dayProgress > 0.45)) {
    if (remaining < 200) return Math.max(150, Math.min(220, remaining || 180));
    return Math.min(band.max, Math.max(band.min * 0.75, remaining * 0.92));
  }

  if (slot === "lunch" && dayProgress > 0.25) {
    return Math.min(band.max, Math.max(band.min, remaining * 0.55));
  }

  // Frühstück / früher Mittag: normale Hausmannskost-Portion
  const cappedByDay = Math.min(band.max, Math.max(band.min, remaining * 0.4));
  return Math.min(band.max, Math.max(band.min, cappedByDay));
}

function scaleIdea(item: CatalogItem, targetKcal: number): DayPlanIdea {
  const factor = Math.min(1.25, Math.max(0.45, targetKcal / item.kcal));
  const kcal = Math.round(item.kcal * factor);
  const carbs = Math.round(item.carbs * factor);
  let amount = item.amount;
  if (factor <= 0.7) {
    amount = `kleinere Portion: ${item.amount}`;
  } else if (factor >= 1.15) {
    amount = `grosse Portion: ${item.amount}`;
  }
  return {
    name: item.name,
    amount,
    kcal,
    carbs,
  };
}

function pickIdeas(
  catalog: CatalogItem[],
  targetKcal: number,
  count = 4,
): DayPlanIdea[] {
  const scored = catalog
    .map((item) => {
      const idea = scaleIdea(item, targetKcal);
      const distance = Math.abs(idea.kcal - targetKcal);
      return { idea, distance, base: item.kcal };
    })
    .sort((a, b) => a.distance - b.distance);

  const picked: DayPlanIdea[] = [];
  const used = new Set<string>();
  for (const row of scored) {
    if (used.has(row.idea.name)) continue;
    // Vermeide Vorschläge, die klar über dem Rest liegen (ausser leichte Kataloge)
    if (row.idea.kcal > targetKcal * 1.35 && targetKcal < 500) continue;
    used.add(row.idea.name);
    picked.push(row.idea);
    if (picked.length >= count) break;
  }

  // Fallback: nimm die nächsten Treffer ohne hartes Cap
  if (picked.length < 3) {
    for (const row of scored) {
      if (used.has(row.idea.name)) continue;
      used.add(row.idea.name);
      picked.push(row.idea);
      if (picked.length >= count) break;
    }
  }

  return picked;
}

function buildSuggestion(params: {
  mode: GoalMode;
  hour: number;
  kcalLeft: number;
  proteinLeft: number;
  carbsLeft: number;
  overKcal: boolean;
  eatenKcal: number;
  dailyGoal: number;
}): DayPlanSuggestion {
  const {
    mode,
    hour,
    kcalLeft,
    proteinLeft,
    carbsLeft,
    overKcal,
    eatenKcal,
    dailyGoal,
  } = params;

  const slot = mealSlotFromHour(hour);
  const mealLabel = SLOT_LABEL[slot];
  const target = targetKcalForSlot({
    slot,
    kcalLeft,
    overKcal,
    eatenKcal,
    dailyGoal,
    mode,
  });
  const catalog = catalogFor(slot, overKcal);
  const ideas = pickIdeas(catalog, target, 4);

  if (overKcal) {
    return {
      title: `Leichte ${mealLabel}-Ideen`,
      body: `Du bist ca. ${formatNumber(Math.abs(kcalLeft), 0)} kcal über dem Tagesziel. Hier eher kleinere Hausmannskost-Portionen – mit kcal und Kohlenhydraten.`,
      mealLabel,
      ideas,
    };
  }

  const restLine = `Noch ca. ${formatNumber(Math.max(0, kcalLeft), 0)} kcal und ${formatNumber(Math.max(0, carbsLeft), 0)} g Kohlenhydrate übrig`;
  const proteinHint =
    proteinLeft >= 25
      ? ` · Protein-Rest ${formatNumber(proteinLeft, 0)} g`
      : "";

  if (slot === "dinner" || (slot === "snack" && eatenKcal > dailyGoal * 0.4)) {
    return {
      title: `${mealLabel} im Restbudget`,
      body: `${restLine}${proteinHint}. Vorschläge sind auf ca. ${formatNumber(Math.round(target), 0)} kcal ausgelegt – Menge und Gericht.`,
      mealLabel,
      ideas,
    };
  }

  return {
    title: `Ideen fürs ${mealLabel}`,
    body: `Gute Hausmannskost rund um ${formatNumber(Math.round(target), 0)} kcal. ${restLine}${proteinHint}.`,
    mealLabel,
    ideas,
  };
}
