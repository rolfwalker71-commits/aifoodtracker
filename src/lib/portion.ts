import type { NutrientValues } from "@/types/nutrition";

export const EMPTY_NUTRIENTS: NutrientValues = {
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

export function roundNutrient(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function scaleNutrients(
  per100g: NutrientValues,
  grams: number,
): NutrientValues {
  const factor = Math.max(grams, 0) / 100;
  return {
    calories: roundNutrient(per100g.calories * factor, 0),
    protein: roundNutrient(per100g.protein * factor),
    carbs: roundNutrient(per100g.carbs * factor),
    fat: roundNutrient(per100g.fat * factor),
    fiber: roundNutrient(per100g.fiber * factor),
    sugar: roundNutrient(per100g.sugar * factor),
    saturatedFat: roundNutrient(per100g.saturatedFat * factor),
    sodium: roundNutrient(per100g.sodium * factor, 0),
    potassium: roundNutrient(per100g.potassium * factor, 0),
    vitaminA: roundNutrient(per100g.vitaminA * factor, 0),
    vitaminC: roundNutrient(per100g.vitaminC * factor),
    vitaminD: roundNutrient(per100g.vitaminD * factor, 2),
    calcium: roundNutrient(per100g.calcium * factor, 0),
    iron: roundNutrient(per100g.iron * factor, 2),
  };
}

/** Parse "250 g", "1 Teller (~300g)", "150" into grams when possible. */
export function parsePortionGrams(input: string): number | null {
  const raw = input.trim().toLowerCase();
  if (!raw) return null;

  const gramMatch = raw.match(/(\d+(?:[.,]\d+)?)\s*(g|gramm|grams?)\b/);
  if (gramMatch) {
    return Number(gramMatch[1].replace(",", "."));
  }

  const kgMatch = raw.match(/(\d+(?:[.,]\d+)?)\s*kg\b/);
  if (kgMatch) {
    return Number(kgMatch[1].replace(",", ".")) * 1000;
  }

  const mlMatch = raw.match(/(\d+(?:[.,]\d+)?)\s*ml\b/);
  if (mlMatch) {
    return Number(mlMatch[1].replace(",", "."));
  }

  if (/^\d+(?:[.,]\d+)?$/.test(raw)) {
    return Number(raw.replace(",", "."));
  }

  return null;
}

export function formatPortionLabel(grams: number, foodName?: string) {
  if (foodName) return `${Math.round(grams)} g ${foodName}`;
  return `${Math.round(grams)} g`;
}

/** Scale absolute nutrient totals from one portion weight to another. */
export function rescaleNutrientTotals(
  current: NutrientValues,
  fromGrams: number,
  toGrams: number,
): NutrientValues {
  if (!fromGrams || fromGrams <= 0 || !toGrams || toGrams <= 0) {
    return { ...current };
  }
  return nutrientsFromPortion(null, current, fromGrams, toGrams);
}

export function nutrientsFromPortion(
  per100g: NutrientValues | null | undefined,
  current: NutrientValues,
  estimatedGrams: number | null | undefined,
  actualGrams: number,
): NutrientValues {
  if (per100g) {
    return scaleNutrients(per100g, actualGrams);
  }

  if (estimatedGrams && estimatedGrams > 0) {
    const factor = actualGrams / estimatedGrams;
    return {
      calories: roundNutrient(current.calories * factor, 0),
      protein: roundNutrient(current.protein * factor),
      carbs: roundNutrient(current.carbs * factor),
      fat: roundNutrient(current.fat * factor),
      fiber: roundNutrient(current.fiber * factor),
      sugar: roundNutrient(current.sugar * factor),
      saturatedFat: roundNutrient(current.saturatedFat * factor),
      sodium: roundNutrient(current.sodium * factor, 0),
      potassium: roundNutrient(current.potassium * factor, 0),
      vitaminA: roundNutrient(current.vitaminA * factor, 0),
      vitaminC: roundNutrient(current.vitaminC * factor),
      vitaminD: roundNutrient(current.vitaminD * factor, 2),
      calcium: roundNutrient(current.calcium * factor, 0),
      iron: roundNutrient(current.iron * factor, 2),
    };
  }

  return current;
}
