"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BarcodeCapture } from "@/components/meals/barcode-capture";
import { CameraCapture } from "@/components/meals/camera-capture";
import { FoodLookup } from "@/components/meals/food-lookup";
import { MealForm } from "@/components/meals/meal-form";
import { MealSaveConfirm } from "@/components/meals/meal-save-confirm";
import { OffCompareCard } from "@/components/meals/off-compare-card";
import { PortionPrompt } from "@/components/meals/portion-prompt";
import { RecognitionPopup } from "@/components/meals/recognition-popup";
import { TextMealCapture } from "@/components/meals/text-meal-capture";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { confidenceLevel } from "@/lib/confidence";
import { toFormDateTime } from "@/lib/datetime";
import { localizeGermanLabel } from "@/lib/de-labels";
import { navigateFresh } from "@/lib/fresh-navigate";
import { scaleIngredients } from "@/lib/meal-ingredients";
import {
  formatPortionLabel,
  nutrientsFromPortion,
  scaleNutrients,
} from "@/lib/portion";
import type { MealFormValues, MealIngredient } from "@/types/meals";
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
    consumedAt: toFormDateTime(),
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
    ingredients: [],
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
  ingredients?: MealIngredient[];
  amountLabel?: string;
  recognitionSubtitle?: string;
  portionConfidence?: number | null;
  confidence?: number | null;
};

type RecognitionState = {
  name: string;
  amountLabel: string;
  subtitle?: string;
  portionConfidence?: number | null;
  confidence?: number | null;
};

export default function NewMealPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [formValues, setFormValues] = useState<MealFormValues>(emptyForm);
  const [tab, setTab] = useState("photo");
  const [step, setStep] = useState<"capture" | "portion" | "confirm" | "details">(
    "capture",
  );
  const [pendingFood, setPendingFood] = useState<PendingFood | null>(null);
  const [recognition, setRecognition] = useState<RecognitionState | null>(null);
  const [offMatch, setOffMatch] = useState<FoodLookupItem | null>(null);

  const formKey = useMemo(
    () =>
      `${formValues.name}-${formValues.portionSize}-${formValues.calories}-${tab}`,
    [formValues.name, formValues.portionSize, formValues.calories, tab],
  );

  function buildMealFromPending(
    pending: PendingFood,
    grams: number,
  ): MealFormValues {
    const nutrients = nutrientsFromPortion(
      pending.nutrientsPer100g,
      pending.currentNutrients ||
        scaleNutrients(pending.nutrientsPer100g, grams),
      pending.estimatedPortionGrams,
      grams,
    );

    return withNutrients(
      {
        ...emptyForm(),
        name: pending.name,
        portionSize: formatPortionLabel(grams),
        mealType: pending.mealType || "SNACK",
        notes: pending.notes ?? "",
        imagePath: pending.imagePath ?? null,
        ingredients: scaleIngredients(
          pending.ingredients ?? [],
          pending.estimatedPortionGrams,
          grams,
        ),
      },
      nutrients,
    );
  }

  function beginPortionFlow(pending: PendingFood, showPopup: boolean) {
    const amountLabel =
      pending.amountLabel ||
      (pending.suggestedGrams
        ? formatPortionLabel(pending.suggestedGrams)
        : "Menge schätzen");

    setPendingFood(pending);
    setStep("portion");

    if (showPopup) {
      setRecognition({
        name: pending.name,
        amountLabel,
        subtitle: pending.recognitionSubtitle,
        portionConfidence: pending.portionConfidence,
        confidence: pending.confidence,
      });
    } else {
      setRecognition(null);
    }
  }

  async function lookupOffMatch(query: string) {
    try {
      const response = await fetch(
        `/api/foods/search?q=${encodeURIComponent(query)}`,
        { cache: "no-store" },
      );
      const data = await response.json();
      if (!response.ok) return;
      const items = (data.items || data.results || data) as FoodLookupItem[];
      const list = Array.isArray(items) ? items : [];
      const first = list.find((item) => item.source === "openfoodfacts");
      setOffMatch(first || null);
    } catch {
      setOffMatch(null);
    }
  }

  function onFoodSelected(
    item: FoodLookupItem,
    mealType?: MealType,
    notes?: string,
  ) {
    const suggested =
      item.servingGrams && item.servingGrams > 0 ? item.servingGrams : 200;
    const name = localizeGermanLabel(
      item.brand ? `${item.brand} ${item.name}` : item.name,
    );
    const portionConfidence =
      item.portionConfidence ?? (item.source === "ai" ? 0.55 : 0.8);

    beginPortionFlow(
      {
        name,
        brand: item.brand,
        mealType,
        notes,
        imagePath: item.imageUrl ?? null,
        nutrientsPer100g: item.nutrientsPer100g,
        suggestedGrams: suggested,
        estimatedPortionGrams: suggested,
        ingredients: item.ingredients ?? [],
        amountLabel: item.servingSizeLabel
          ? `${localizeAmount(item.servingSizeLabel, suggested)}`
          : formatPortionLabel(suggested),
        recognitionSubtitle:
          item.source === "openfoodfacts"
            ? "Produkt gefunden – bitte Menge bestätigen"
            : "KI-Schätzung – bitte Menge bestätigen",
        helperText:
          "Gib die gegessene Menge ein. Alle Nährwerte werden darauf umgerechnet und erst beim Speichern übernommen.",
        portionConfidence,
        confidence: item.confidence ?? portionConfidence,
      },
      true,
    );
    setOffMatch(null);
  }

  function onCameraAnalyzed(analysis: PortionAwareAnalysis, imagePath: string) {
    const suggested =
      analysis.estimatedPortionGrams && analysis.estimatedPortionGrams > 0
        ? analysis.estimatedPortionGrams
        : 250;
    const portion = confidenceLevel(analysis.portionConfidence);
    const name = localizeGermanLabel(analysis.name);

    beginPortionFlow(
      {
        name,
        mealType: analysis.mealType,
        notes: analysis.notes,
        imagePath,
        nutrientsPer100g: analysis.nutrientsPer100g,
        estimatedPortionGrams: analysis.estimatedPortionGrams ?? suggested,
        currentNutrients: analysis.nutrients,
        suggestedGrams: suggested,
        ingredients: analysis.ingredients,
        amountLabel:
          analysis.portionSize ||
          `Gesamtgewicht auf dem Teller ca. ${Math.round(suggested)} g`,
        recognitionSubtitle: analysis.needsPortionInput
          ? `Gesamtgewicht prüfen (${portion.label})`
          : `Erkannt – Menge bestätigen (${portion.label})`,
        helperText:
          "Die Gramm-Angabe ist das geschätzte Gesamtgewicht aller Speisen (z. B. Fleisch + Beilagen). Passe sie bei Bedarf an – die Nährwerte werden darauf umgerechnet.",
        portionConfidence: analysis.portionConfidence,
        confidence: analysis.confidence ?? null,
      },
      true,
    );

    void lookupOffMatch(name);
  }

  function applyOffMatch(item: FoodLookupItem) {
    if (!pendingFood) return;
    const label = item.brand ? `${item.brand} ${item.name}` : item.name;
    setPendingFood({
      ...pendingFood,
      name: localizeGermanLabel(label),
      brand: item.brand,
      nutrientsPer100g: item.nutrientsPer100g,
      currentNutrients: undefined,
      imagePath: pendingFood.imagePath || item.imageUrl || null,
      notes: pendingFood.notes
        ? `${pendingFood.notes}\nNährwerte von Open Food Facts übernommen.`
        : "Nährwerte von Open Food Facts übernommen.",
      portionConfidence: 0.85,
      recognitionSubtitle: "OFF-Werte übernommen – Menge noch bestätigen",
    });
    setOffMatch(null);
    toast.success("Open-Food-Facts-Werte übernommen");
  }

  function confirmPortion(grams: number) {
    if (!pendingFood) return;
    const meal = buildMealFromPending(pendingFood, grams);
    setFormValues(meal);
    setStep("confirm");
    setTab("photo");
    toast.success("Berechnet", {
      description: `Nährwerte für ${formatPortionLabel(grams)} umgerechnet.`,
    });
  }

  function recalculatePortion(grams: number) {
    if (!pendingFood) {
      const previous = Number(
        String(formValues.portionSize || "").match(/(\d+(?:[.,]\d+)?)/)?.[1]?.replace(
          ",",
          ".",
        ),
      );
      if (previous > 0 && formValues.calories > 0) {
        const factor = grams / previous;
        setFormValues({
          ...formValues,
          portionSize: formatPortionLabel(grams),
          calories: Math.round(formValues.calories * factor),
          protein: Number((formValues.protein * factor).toFixed(1)),
          carbs: Number((formValues.carbs * factor).toFixed(1)),
          fat: Number((formValues.fat * factor).toFixed(1)),
          fiber: Number((formValues.fiber * factor).toFixed(1)),
          sugar: Number((formValues.sugar * factor).toFixed(1)),
          saturatedFat: Number((formValues.saturatedFat * factor).toFixed(1)),
          sodium: Math.round(formValues.sodium * factor),
          potassium: Math.round(formValues.potassium * factor),
          vitaminA: Math.round(formValues.vitaminA * factor),
          vitaminC: Number((formValues.vitaminC * factor).toFixed(1)),
          vitaminD: Number((formValues.vitaminD * factor).toFixed(2)),
          calcium: Math.round(formValues.calcium * factor),
          iron: Number((formValues.iron * factor).toFixed(2)),
          ingredients: scaleIngredients(
            formValues.ingredients ?? [],
            previous,
            grams,
          ),
        });
      }
      return;
    }

    setFormValues(buildMealFromPending(pendingFood, grams));
  }

  async function saveMeal(values: MealFormValues = formValues) {
    setBusy(true);
    try {
      const response = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          ...values,
          consumedAt: new Date(values.consumedAt).toISOString(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Speichern fehlgeschlagen");
      }
      if (data.symbolPending && data.meal?.id) {
        const { requestMealSymbol } = await import("@/lib/pending-symbols");
        requestMealSymbol(data.meal.id as string);
      }
      toast.success("Mahlzeit gespeichert", {
        description: data.symbolPending
          ? "Symbolbild wird im Hintergrund erzeugt…"
          : undefined,
      });
      navigateFresh(router, "/dashboard");
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
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Mahlzeit erfassen
        </h1>
        <p className="text-sm text-muted-foreground">
          Foto, Freitext, Barcode oder Suche → Menge prüfen → speichern.
        </p>
      </div>

      <RecognitionPopup
        open={Boolean(recognition)}
        name={recognition?.name || ""}
        amountLabel={recognition?.amountLabel}
        subtitle={recognition?.subtitle}
        portionConfidence={recognition?.portionConfidence}
        confidence={recognition?.confidence}
        onContinue={() => setRecognition(null)}
      />

      {step === "portion" && pendingFood ? (
        <>
          <PortionPrompt
            foodName={pendingFood.name}
            suggestedGrams={pendingFood.suggestedGrams}
            helperText={pendingFood.helperText}
            portionConfidence={pendingFood.portionConfidence}
            confirmLabel="Berechnen"
            onConfirm={(grams) => confirmPortion(grams)}
          />
          {offMatch ? (
            <OffCompareCard
              aiName={pendingFood.name}
              aiPer100g={pendingFood.nutrientsPer100g}
              match={offMatch}
              onUseOff={applyOffMatch}
              onDismiss={() => setOffMatch(null)}
            />
          ) : null}
        </>
      ) : null}

      {step === "confirm" ? (
        <MealSaveConfirm
          key={`confirm-${formKey}`}
          values={formValues}
          busy={busy}
          onChange={setFormValues}
          onRecalculatePortion={recalculatePortion}
          onSave={() => saveMeal()}
          onEditDetails={() => setStep("details")}
        />
      ) : null}

      {step === "details" ? (
        <Card>
          <CardHeader>
            <CardTitle>Alle Nährwerte</CardTitle>
          </CardHeader>
          <CardContent>
            <MealForm
              key={`details-${formKey}`}
              initialValues={formValues}
              submitLabel="Speichern"
              onSubmit={saveMeal}
              busy={busy}
            />
          </CardContent>
        </Card>
      ) : null}

      {step === "capture" ? (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-4">
            <TabsTrigger value="photo">Foto</TabsTrigger>
            <TabsTrigger value="text">Freitext</TabsTrigger>
            <TabsTrigger value="barcode">Barcode</TabsTrigger>
            <TabsTrigger value="manual">Suche</TabsTrigger>
          </TabsList>

          <TabsContent value="photo" className="space-y-4">
            <CameraCapture onAnalyzed={onCameraAnalyzed} />
          </TabsContent>

          <TabsContent value="text" className="space-y-4">
            <TextMealCapture onSelect={onFoodSelected} />
          </TabsContent>

          <TabsContent value="barcode" className="space-y-4">
            <BarcodeCapture onSelect={onFoodSelected} />
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
        </Tabs>
      ) : null}

      {step === "portion" || step === "confirm" || step === "details" ? (
        <button
          type="button"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => {
            setStep("capture");
            setPendingFood(null);
            setRecognition(null);
            setOffMatch(null);
          }}
        >
          Abbrechen und neu erfassen
        </button>
      ) : null}
    </div>
  );
}

function localizeAmount(label: string, fallbackGrams: number) {
  const trimmed = label.trim();
  if (!trimmed) return formatPortionLabel(fallbackGrams);
  return trimmed;
}
