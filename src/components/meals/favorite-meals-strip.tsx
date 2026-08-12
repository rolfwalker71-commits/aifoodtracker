"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CopyPlus, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";
import type { MealType } from "@/generated/prisma/client";
import { MEAL_TYPE_LABELS } from "@/lib/nutrition";

export type FavoriteMeal = {
  id: string;
  name: string;
  calories: number;
  mealType: MealType;
  imagePath?: string | null;
  portionSize?: string | null;
};

export function FavoriteMealsStrip({ meals }: { meals: FavoriteMeal[] }) {
  const router = useRouter();

  async function duplicate(id: string) {
    try {
      const response = await fetch(`/api/meals/${id}/duplicate`, {
        method: "POST",
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Konnte nicht kopiert werden");
      }
      toast.success("Nochmal gespeichert");
      router.refresh();
      router.push("/dashboard");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Konnte nicht kopiert werden",
      );
    }
  }

  if (!meals.length) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-xl font-bold">Favoriten</h2>
        <Star className="h-4 w-4 text-amber-500" />
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {meals.map((meal) => (
          <div
            key={meal.id}
            className="w-44 shrink-0 rounded-2xl border border-border bg-background p-3"
          >
            <Link href={`/meals/${meal.id}`} className="block space-y-2">
              <div className="h-20 overflow-hidden rounded-xl bg-muted">
                {meal.imagePath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={meal.imagePath}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    Kein Bild
                  </div>
                )}
              </div>
              <p className="line-clamp-2 text-sm font-semibold leading-snug">
                {meal.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {MEAL_TYPE_LABELS[meal.mealType]} · {formatNumber(meal.calories)}{" "}
                kcal
              </p>
            </Link>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-2 w-full"
              onClick={() => void duplicate(meal.id)}
            >
              <CopyPlus className="h-3.5 w-3.5" />
              Nochmal
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
