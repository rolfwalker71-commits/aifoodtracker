import { MealType } from "@/generated/prisma/client";

export type MealIngredient = {
  name: string;
  /** Lesbare Portionsangabe, z. B. "180 g" oder "2 EL" */
  portionSize: string;
  /** Geschätzte Menge in Gramm, falls bekannt */
  grams?: number | null;
};

export type MealFormValues = {
  name: string;
  portionSize?: string;
  mealType: MealType;
  consumedAt: string;
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
  notes?: string;
  imagePath?: string | null;
  ingredients?: MealIngredient[];
};

export type StatsRange = "day" | "week" | "month";
