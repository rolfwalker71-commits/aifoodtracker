import { MealType } from "@/generated/prisma/client";

export type NutrientTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  saturatedFat: number;
  sodium: number;
  potassium: number;
  vitaminA: number;
  vitaminC: number;
  vitaminD: number;
  calcium: number;
  iron: number;
};

export type NutritionGoals = {
  dailyCaloriesGoal: number;
  dailyProteinGoal: number;
  dailyCarbsGoal: number;
  dailyFatGoal: number;
  dailyFiberGoal: number;
  dailySugarGoal: number;
  dailySodiumGoal: number;
  dailyPotassiumGoal: number;
  dailyVitaminAGoal: number;
  dailyVitaminCGoal: number;
  dailyVitaminDGoal: number;
  dailyCalciumGoal: number;
  dailyIronGoal: number;
};

export const EMPTY_TOTALS: NutrientTotals = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
  sugar: 0,
  saturatedFat: 0,
  sodium: 0,
  potassium: 0,
  vitaminA: 0,
  vitaminC: 0,
  vitaminD: 0,
  calcium: 0,
  iron: 0,
};

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  BREAKFAST: "Frühstück",
  LUNCH: "Mittagessen",
  DINNER: "Abendessen",
  SNACK: "Snack",
};

/** Deutsche Anzeigenamen für Nährwert-Keys (Charts, Tooltips, Selects). */
export const NUTRIENT_LABELS = {
  calories: "Kalorien",
  protein: "Protein",
  carbs: "Kohlenhydrate",
  fat: "Fett",
  fiber: "Ballaststoffe",
  sugar: "Zucker",
  saturatedFat: "Gesättigte Fette",
  sodium: "Natrium",
  potassium: "Kalium",
  vitaminA: "Vitamin A",
  vitaminC: "Vitamin C",
  vitaminD: "Vitamin D",
  calcium: "Kalzium",
  iron: "Eisen",
} as const;

export type NutrientLabelKey = keyof typeof NUTRIENT_LABELS;

export function nutrientLabel(key: string) {
  return NUTRIENT_LABELS[key as NutrientLabelKey] ?? key;
}

export function sumNutrients<T extends Partial<NutrientTotals>>(
  items: T[],
): NutrientTotals {
  return items.reduce(
    (acc, item) => ({
      calories: acc.calories + (item.calories ?? 0),
      protein: acc.protein + (item.protein ?? 0),
      carbs: acc.carbs + (item.carbs ?? 0),
      fat: acc.fat + (item.fat ?? 0),
      fiber: acc.fiber + (item.fiber ?? 0),
      sugar: acc.sugar + (item.sugar ?? 0),
      saturatedFat: acc.saturatedFat + (item.saturatedFat ?? 0),
      sodium: acc.sodium + (item.sodium ?? 0),
      potassium: acc.potassium + (item.potassium ?? 0),
      vitaminA: acc.vitaminA + (item.vitaminA ?? 0),
      vitaminC: acc.vitaminC + (item.vitaminC ?? 0),
      vitaminD: acc.vitaminD + (item.vitaminD ?? 0),
      calcium: acc.calcium + (item.calcium ?? 0),
      iron: acc.iron + (item.iron ?? 0),
    }),
    { ...EMPTY_TOTALS },
  );
}

export function progressPercent(current: number, goal: number) {
  if (!goal || goal <= 0) return 0;
  return (current / goal) * 100;
}

export function toMealType(value: string): MealType {
  const upper = value.toUpperCase();
  if (upper in MEAL_TYPE_LABELS) {
    return upper as MealType;
  }
  const byLabel = Object.entries(MEAL_TYPE_LABELS).find(
    ([, label]) => label.toLowerCase() === value.toLowerCase(),
  );
  return (byLabel?.[0] as MealType) ?? "SNACK";
}

/** Lokalzeit: <10 Frühstück, <13 Mittag, <18 Snack, sonst Abendessen. */
export function mealTypeFromLocalHour(hour: number): MealType {
  if (hour < 10) return "BREAKFAST";
  if (hour < 13) return "LUNCH";
  if (hour < 18) return "SNACK";
  return "DINNER";
}

export function suggestMealTypeNow(now = new Date()): MealType {
  // Lazy import avoided: datetime uses nutrition-free path; use Intl for Zurich hour.
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: process.env.APP_TIMEZONE || "Europe/Zurich",
      hour: "numeric",
      hourCycle: "h23",
    }).format(now),
  );
  return mealTypeFromLocalHour(hour);
}

export function mealTypeFromFormDateTime(value: string): MealType {
  const match = value.match(/T(\d{2}):/);
  if (!match) return suggestMealTypeNow();
  return mealTypeFromLocalHour(Number(match[1]));
}
