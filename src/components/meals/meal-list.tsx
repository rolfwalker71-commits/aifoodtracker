"use client";

import Link from "next/link";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MEAL_TYPE_LABELS } from "@/lib/nutrition";
import { formatNumber } from "@/lib/utils";
import type { MealType } from "@/generated/prisma/client";

export type MealListItem = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealType: MealType;
  consumedAt: string;
  imagePath?: string | null;
};

function MealThumb({ src, alt }: { src: string; alt: string }) {
  // Support both local /uploads and remote Open Food Facts URLs
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className="h-full w-full object-cover" />
  );
}

export function MealList({ meals }: { meals: MealListItem[] }) {
  const router = useRouter();

  async function removeMeal(id: string) {
    const confirmed = window.confirm("Mahlzeit wirklich löschen?");
    if (!confirmed) return;

    const response = await fetch(`/api/meals/${id}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error("Löschen fehlgeschlagen");
      return;
    }
    toast.success("Mahlzeit gelöscht");
    router.refresh();
  }

  if (!meals.length) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Noch keine Mahlzeiten erfasst. Tippe auf Erfassen, um zu starten.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {meals.map((meal) => (
        <Card key={meal.id} className="overflow-hidden transition hover:shadow-md">
          <CardContent className="flex gap-3 p-3">
            <Link
              href={`/meals/${meal.id}`}
              className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted"
            >
              {meal.imagePath ? (
                <MealThumb src={meal.imagePath} alt={meal.name} />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  Manuell
                </div>
              )}
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link
                    href={`/meals/${meal.id}`}
                    className="line-clamp-1 font-semibold hover:underline"
                  >
                    {meal.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {MEAL_TYPE_LABELS[meal.mealType]} ·{" "}
                    {format(new Date(meal.consumedAt), "dd.MM.yyyy HH:mm", {
                      locale: de,
                    })}
                  </p>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Löschen"
                  onClick={() => removeMeal(meal.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {formatNumber(meal.calories)} kcal · P {formatNumber(meal.protein, 0)}g ·
                K {formatNumber(meal.carbs, 0)}g · F {formatNumber(meal.fat, 0)}g
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
