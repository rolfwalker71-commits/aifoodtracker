"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { CameraCapture } from "@/components/meals/camera-capture";
import { FoodLookup } from "@/components/meals/food-lookup";
import { MealForm } from "@/components/meals/meal-form";
import { PortionPrompt } from "@/components/meals/portion-prompt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPortionLabel, nutrientsFromPortion, scaleNutrients } from "@/lib/portion";
import type { MealFormValues } from "@/types/meals";
import type {
  FoodLookupItem,
  NutrientValues,
  PortionAwareAnalysis,
} from "@/types/nutrition";
import type { MealType } from "@/generated/prisma/client";

function emptyForm(): MealFormValues {
  return {
    name: "",
    portionSize: "",
    mealType: "SNACK",
    consumedAt: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
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
    notes: "",
    imagePath: null,
  };
}

function withNutrients(
  base: MealFormValues,
  nutrients: NutrientValues,
): MealFormValues {
  return { ...base, ...nutrients };
}

type PendingFood = {
  name: string;
  brand?: string;
  mealType?: MealType;
  notes?: string;
  imagePath?: string | null;
  nutrientsPer100g: NutrientValues;
  estimatedPortionGrams?: number | null;
  currentNutrients?: NutrientValues;
  suggestedGrams?: number | null;
  helperText?: string;
  allowSkip?: boolean;
};

export default function NewMealPage() {
  const [busy, setBusy] = useState(false);
  const [formValues, setFormValues] = useState<MealFormValues>(emptyForm);
  const [tab, setTab] = useState("photo");
  const [pendingFood, setPendingFood] = useState<PendingFood | null>(null);

  const formKey = useMemo(
    () =>
      `${formValues.name}-${formValues.portionSize}-${formValues.calories}-${tab}`,
    [formValues.name, formValues.portionSize, formValues.calories, tab],
  );

  function applyFilledMeal(values: MealFormValues) {
    setFormValues(values);
    setPendingFood(null);
    setTab("review");
  }

  function askForPortion(pending: PendingFood) {
    setPendingFood(pending);
  }

  function onFoodSelected(
    item: FoodLookupItem,
    mealType?: MealType,
    notes?: string,
  ) {
    const suggested =
      item.servingGrams && item.servingGrams > 0 ? item.servingGrams : 200;

    askForPortion({
      name: item.brand ? `${item.brand} ${item.name}` : item.name,
      brand: item.brand,
      mealType,
      notes,
      imagePath: item.imageUrl ?? null,
      nutrientsPer100g: item.nutrientsPer100g,
      suggestedGrams: suggested,
      helperText:
        item.source === "openfoodfacts"
          ? "Produkt gefunden. Gib nur noch die gegessene Menge an – die Nährwerte werden berechnet."
          : "KI-Schätzung geladen. Gib die Portionsgröße an, dann werden die Felder ausgefüllt.",
    });
  }

  function onCameraAnalyzed(analysis: PortionAwareAnalysis, imagePath: string) {
    if (analysis.needsPortionInput) {
      askForPortion({
        name: analysis.name,
        mealType: analysis.mealType,
        notes: analysis.notes,
        imagePath,
        nutrientsPer100g: analysis.nutrientsPer100g,
        estimatedPortionGrams: analysis.estimatedPortionGrams,
        currentNutrients: analysis.nutrients,
        suggestedGrams: analysis.estimatedPortionGrams,
        allowSkip: Boolean(analysis.estimatedPortionGrams),
        helperText: `Die Portionsgröße von „${analysis.name}“ ist unsicher. Wie viel hast du gegessen? Die Nährwerte werden entsprechend umgerechnet.`,
      });
      toast.message("Portionsgröße benötigt", {
        description: "Bitte Menge angeben, dann werden die Werte berechnet.",
      });
      return;
    }

    applyFilledMeal(
      withNutrients(
        {
          ...emptyForm(),
          name: analysis.name,
          portionSize:
            analysis.portionSize ||
            (analysis.estimatedPortionGrams
              ? formatPortionLabel(analysis.estimatedPortionGrams)
              : ""),
          mealType: analysis.mealType,
          notes: analysis.notes ?? "",
          imagePath,
        },
        analysis.nutrients,
      ),
    );
    toast.success("KI-Analyse abgeschlossen – bitte prüfen und speichern.");
  }

  function confirmPortion(grams: number, label: string) {
    if (!pendingFood) return;

    const nutrients = nutrientsFromPortion(
      pendingFood.nutrientsPer100g,
      pendingFood.currentNutrients || scaleNutrients(pendingFood.nutrientsPer100g, grams),
      pendingFood.estimatedPortionGrams,
      grams,
    );

    applyFilledMeal(
      withNutrients(
        {
          ...emptyForm(),
          name: pendingFood.name,
          portionSize: label,
          mealType: pendingFood.mealType || "SNACK",
          notes: pendingFood.notes ?? "",
          imagePath: pendingFood.imagePath ?? null,
        },
        nutrients,
      ),
    );
    toast.success("Nährwerte für deine Portion ausgefüllt.");
  }

  function skipPortionPrompt() {
    if (!pendingFood?.currentNutrients) {
      setPendingFood(null);
      return;
    }

    applyFilledMeal(
      withNutrients(
        {
          ...emptyForm(),
          name: pendingFood.name,
          portionSize: pendingFood.estimatedPortionGrams
            ? formatPortionLabel(pendingFood.estimatedPortionGrams)
            : "",
          mealType: pendingFood.mealType || "SNACK",
          notes: pendingFood.notes ?? "",
          imagePath: pendingFood.imagePath ?? null,
        },
        pendingFood.currentNutrients,
      ),
    );
  }

  async function saveMeal(values: MealFormValues) {
    setBusy(true);
    try {
      const response = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          consumedAt: new Date(values.consumedAt).toISOString(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Speichern fehlgeschlagen");
      }
      toast.success("Mahlzeit gespeichert");
      // Hard navigation avoids stale RSC/router cache on the dashboard
      window.location.assign("/dashboard");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Speichern fehlgeschlagen",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Mahlzeit erfassen
        </h1>
        <p className="text-sm text-muted-foreground">
          Markenprodukt suchen, KI schätzen oder Foto analysieren – Portionsgröße
          angeben, Rest wird ausgefüllt.
        </p>
      </div>

      {pendingFood && (
        <PortionPrompt
          foodName={pendingFood.name}
          suggestedGrams={pendingFood.suggestedGrams}
          helperText={pendingFood.helperText}
          onConfirm={confirmPortion}
          onSkip={pendingFood.allowSkip ? skipPortionPrompt : undefined}
        />
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="photo">Foto</TabsTrigger>
          <TabsTrigger value="manual">Suche / Manuell</TabsTrigger>
          <TabsTrigger value="review">Korrektur</TabsTrigger>
        </TabsList>

        <TabsContent value="photo" className="space-y-4">
          <CameraCapture onAnalyzed={onCameraAnalyzed} />
        </TabsContent>

        <TabsContent value="manual" className="space-y-4">
          <FoodLookup onSelect={onFoodSelected} />
          <Card>
            <CardHeader>
              <CardTitle>Oder komplett manuell</CardTitle>
            </CardHeader>
            <CardContent>
              <MealForm
                key={`manual-${formKey}`}
                initialValues={emptyForm()}
                submitLabel="Mahlzeit speichern"
                onSubmit={saveMeal}
                busy={busy}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="review">
          <Card>
            <CardHeader>
              <CardTitle>Live-Korrektur</CardTitle>
            </CardHeader>
            <CardContent>
              <MealForm
                key={`review-${formKey}`}
                initialValues={formValues}
                submitLabel="Korrigierte Mahlzeit speichern"
                onSubmit={saveMeal}
                busy={busy}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
