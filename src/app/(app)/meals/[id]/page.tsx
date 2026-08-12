"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { MealForm } from "@/components/meals/meal-form";
import { MealSaveConfirm } from "@/components/meals/meal-save-confirm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toFormDateTime } from "@/lib/datetime";
import { localizeGermanLabel } from "@/lib/de-labels";
import { navigateFresh } from "@/lib/fresh-navigate";
import { scaleIngredients } from "@/lib/meal-ingredients";
import { parseStoredIngredients } from "@/lib/meal-ingredients";
import {
  formatPortionLabel,
  parsePortionGrams,
  rescaleNutrientTotals,
} from "@/lib/portion";
import type { MealFormValues } from "@/types/meals";

function resolveCurrentGrams(values: MealFormValues): number | null {
  const fromLabel = parsePortionGrams(values.portionSize || "");
  if (fromLabel && fromLabel > 0) return fromLabel;

  const ingredientTotal = (values.ingredients ?? []).reduce(
    (sum, item) => sum + (item.grams && item.grams > 0 ? item.grams : 0),
    0,
  );
  return ingredientTotal > 0 ? ingredientTotal : null;
}

export default function EditMealPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [values, setValues] = useState<MealFormValues | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"simple" | "details">("simple");

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
        name: localizeGermanLabel(meal.name),
        portionSize: meal.portionSize ?? "",
        mealType: meal.mealType,
        consumedAt: toFormDateTime(meal.consumedAt),
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
        ingredients: parseStoredIngredients(meal.ingredients),
      });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [params.id, router]);

  function recalculatePortion(grams: number) {
    if (!values) return;
    const previous = resolveCurrentGrams(values);
    if (!previous || previous <= 0) {
      toast.error("Aktuelle Menge in Gramm nicht erkennbar. Bitte zuerst z. B. „250 g“ setzen.");
      setValues({
        ...values,
        portionSize: formatPortionLabel(grams),
      });
      return;
    }

    const nutrients = rescaleNutrientTotals(
      {
        calories: values.calories,
        protein: values.protein,
        carbs: values.carbs,
        fat: values.fat,
        fiber: values.fiber,
        sugar: values.sugar,
        saturatedFat: values.saturatedFat,
        sodium: values.sodium,
        potassium: values.potassium,
        vitaminA: values.vitaminA,
        vitaminC: values.vitaminC,
        vitaminD: values.vitaminD,
        calcium: values.calcium,
        iron: values.iron,
      },
      previous,
      grams,
    );

    setValues({
      ...values,
      ...nutrients,
      portionSize: formatPortionLabel(grams),
      ingredients: scaleIngredients(
        values.ingredients ?? [],
        previous,
        grams,
      ),
    });
    toast.success("Nährwerte neu berechnet", {
      description: `Umgerechnet von ${formatPortionLabel(previous)} auf ${formatPortionLabel(grams)}.`,
    });
  }

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
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Mahlzeit bearbeiten
        </h1>
        <p className="text-sm text-muted-foreground">
          Menge ändern → neu berechnen → speichern
        </p>
      </div>

      {mode === "simple" ? (
        <MealSaveConfirm
          values={values}
          busy={busy}
          onChange={setValues}
          onRecalculatePortion={recalculatePortion}
          onSave={() => onSubmit(values)}
          onEditDetails={() => setMode("details")}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{values.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <MealForm
              key={`${values.portionSize}-${values.calories}`}
              initialValues={values}
              onSubmit={onSubmit}
              busy={busy}
              submitLabel="Änderungen speichern"
              onPortionGramsChange={recalculatePortion}
            />
            <button
              type="button"
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
              onClick={() => setMode("simple")}
            >
              Zurück zur einfachen Ansicht
            </button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
