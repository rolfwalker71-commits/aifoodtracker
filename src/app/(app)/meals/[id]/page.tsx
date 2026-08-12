"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { MealForm } from "@/components/meals/meal-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { navigateFresh } from "@/lib/fresh-navigate";
import type { MealFormValues } from "@/types/meals";

export default function EditMealPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [values, setValues] = useState<MealFormValues | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const response = await fetch(`/api/meals/${params.id}`, {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Mahlzeit nicht gefunden");
        navigateFresh(router, "/meals");
        return;
      }
      if (cancelled) return;
      const meal = data.meal;
      setValues({
        name: meal.name,
        portionSize: meal.portionSize ?? "",
        mealType: meal.mealType,
        consumedAt: format(new Date(meal.consumedAt), "yyyy-MM-dd'T'HH:mm"),
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        fiber: meal.fiber,
        sugar: meal.sugar,
        saturatedFat: meal.saturatedFat,
        sodium: meal.sodium,
        potassium: meal.potassium,
        vitaminA: meal.vitaminA,
        vitaminC: meal.vitaminC,
        vitaminD: meal.vitaminD,
        calcium: meal.calcium,
        iron: meal.iron,
        notes: meal.notes ?? "",
        imagePath: meal.imagePath,
      });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [params.id, router]);

  async function onSubmit(next: MealFormValues) {
    setBusy(true);
    try {
      const response = await fetch(`/api/meals/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          ...next,
          consumedAt: new Date(next.consumedAt).toISOString(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Aktualisierung fehlgeschlagen");
      }
      toast.success("Mahlzeit aktualisiert");
      navigateFresh(router, "/meals");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Aktualisierung fehlgeschlagen",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!values) {
    return <p className="text-sm text-muted-foreground">Lade Mahlzeit…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Mahlzeit bearbeiten
        </h1>
        <p className="text-sm text-muted-foreground">
          Werte anpassen und speichern
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{values.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <MealForm
            initialValues={values}
            onSubmit={onSubmit}
            busy={busy}
            submitLabel="Änderungen speichern"
          />
        </CardContent>
      </Card>
    </div>
  );
}
