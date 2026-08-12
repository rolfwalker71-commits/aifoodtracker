import { MealType } from "@/generated/prisma/client";

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
};

export type StatsRange = "day" | "week" | "month";
