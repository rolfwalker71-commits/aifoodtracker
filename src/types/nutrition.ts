import type { MealType } from "@/generated/prisma/client";

export type NutrientValues = {
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

export type FoodLookupItem = {
  id: string;
  source: "openfoodfacts" | "ai";
  name: string;
  brand?: string;
  barcode?: string;
  imageUrl?: string;
  servingSizeLabel?: string;
  servingGrams?: number | null;
  nutrientsPer100g: NutrientValues;
  quantityLabel?: string;
};

export type PortionAwareAnalysis = {
  name: string;
  mealType: MealType;
  portionSize: string;
  estimatedPortionGrams: number | null;
  portionConfidence: number;
  needsPortionInput: boolean;
  nutrientsPer100g: NutrientValues;
  nutrients: NutrientValues;
  confidence?: number;
  notes?: string;
};
