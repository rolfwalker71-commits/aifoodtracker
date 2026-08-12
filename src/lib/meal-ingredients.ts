import { z } from "zod";
import { localizeGermanLabel } from "@/lib/de-labels";
import { formatPortionLabel } from "@/lib/portion";
import type { MealIngredient } from "@/types/meals";

export const mealIngredientSchema = z.object({
  name: z.string().min(1),
  portionSize: z.string().optional().default(""),
  grams: z.coerce.number().positive().nullable().optional(),
});

export function normalizeIngredients(
  ingredients: Array<{
    name: string;
    portionSize?: string;
    grams?: number | null;
  }> = [],
): MealIngredient[] {
  const result: MealIngredient[] = [];
  for (const item of ingredients) {
    const name = item.name.trim();
    if (!name) continue;
    const grams =
      typeof item.grams === "number" && item.grams > 0 ? item.grams : null;
    const portionSize =
      item.portionSize?.trim() || (grams ? formatPortionLabel(grams) : "");
    result.push({
      name: localizeGermanLabel(name),
      portionSize: localizeGermanLabel(portionSize),
      grams,
    });
  }
  return result;
}

export const mealIngredientsField = z
  .array(mealIngredientSchema)
  .optional()
  .nullable()
  .transform((value) => (value ? normalizeIngredients(value) : []));

export function scaleIngredients(
  ingredients: MealIngredient[],
  fromGrams: number | null | undefined,
  toGrams: number,
): MealIngredient[] {
  if (!fromGrams || fromGrams <= 0 || toGrams <= 0) return ingredients;
  const factor = toGrams / fromGrams;
  return ingredients.map((item) => {
    if (!item.grams || item.grams <= 0) return item;
    const grams = Math.round(item.grams * factor);
    return {
      ...item,
      grams,
      portionSize: formatPortionLabel(grams),
    };
  });
}

export function parseStoredIngredients(value: unknown): MealIngredient[] {
  if (!Array.isArray(value)) return [];
  const parsed = z.array(mealIngredientSchema).safeParse(value);
  if (!parsed.success) return [];
  return normalizeIngredients(parsed.data);
}
