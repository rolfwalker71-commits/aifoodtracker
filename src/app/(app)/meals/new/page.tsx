"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BarcodeCapture } from "@/components/meals/barcode-capture";
import { CameraCapture } from "@/components/meals/camera-capture";
import { FoodLookup } from "@/components/meals/food-lookup";
import {
  buildAssistSteps,
  CaptureIdentityStep,
  type AssistStepId,
  type CaptureEntryKind,
  MealCaptureAssistant,
} from "@/components/meals/meal-capture-assistant";
import { MealForm } from "@/components/meals/meal-form";
import { MealSaveConfirm } from "@/components/meals/meal-save-confirm";
import { OffCompareCard } from "@/components/meals/off-compare-card";
import { PortionPrompt } from "@/components/meals/portion-prompt";
import { TextMealCapture } from "@/components/meals/text-meal-capture";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { confidenceLevel } from "@/lib/confidence";
import { toFormDateTime } from "@/lib/datetime";
import { localizeGermanLabel } from "@/lib/de-labels";
import { navigateFresh } from "@/lib/fresh-navigate";
import { scaleIngredients } from "@/lib/meal-ingredients";
import { suggestMealTypeNow } from "@/lib/nutrition";
import { enqueueOfflineMeal } from "@/lib/offline-meal-queue";
import {
  formatPortionLabel,
  nutrientsFromPortion,
  scaleNutrients,
} from "@/lib/portion";
import { suggestPortionGrams } from "@/lib/portion-suggestion";
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
    mealType: suggestMealTypeNow(),
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
  /** Schätzung vor Confidence-Mix */
  rawEstimateGrams?: number | null;
  currentNutrients?: NutrientValues;
  suggestedGrams?: number | null;
  helperText?: string;
  ingredients?: MealIngredient[];
  amountLabel?: string;
  recognitionSubtitle?: string;
  portionConfidence?: number | null;
  confidence?: number | null;
  allowOffCompare?: boolean;
};

export default function NewMealPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [formValues, setFormValues] = useState<MealFormValues>(emptyForm);
  const [tab, setTab] = useState("photo");
  const [phase, setPhase] = useState<"capture" | "assist" | "details">(
    "capture",
  );
  const [assistStep, setAssistStep] = useState<AssistStepId>("identity");
  const [entryKind, setEntryKind] = useState<CaptureEntryKind>("photo");
  const [pendingFood, setPendingFood] = useState<PendingFood | null>(null);
  const [offMatch, setOffMatch] = useState<FoodLookupItem | null>(null);
  const [confirmedGrams, setConfirmedGrams] = useState<number | null>(null);

  const formKey = useMemo(
    () =>
      `${formValues.name}-${formValues.portionSize}-${formValues.calories}-${tab}`,
    [formValues.name, formValues.portionSize, formValues.calories, tab],
  );

  const assistSteps = useMemo(
    () =>
      buildAssistSteps(
        entryKind,
        Boolean(pendingFood?.allowOffCompare),
        Boolean(offMatch),
      ),
    [entryKind, pendingFood?.allowOffCompare, offMatch],
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
        mealType: pending.mealType || suggestMealTypeNow(),
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

  function resetAssist() {
    setPhase("capture");
    setAssistStep("identity");
    setPendingFood(null);
    setOffMatch(null);
    setConfirmedGrams(null);
  }

  function startAssist(
    pending: PendingFood,
    entry: CaptureEntryKind,
    options?: { lookupOff?: boolean },
  ) {
    const estimate =
      pending.estimatedPortionGrams && pending.estimatedPortionGrams > 0
        ? pending.estimatedPortionGrams
        : pending.suggestedGrams && pending.suggestedGrams > 0
          ? pending.suggestedGrams
          : 200;
    const suggestion = suggestPortionGrams(
      estimate,
      pending.portionConfidence,
    );

    setPendingFood({
      ...pending,
      estimatedPortionGrams: estimate,
      rawEstimateGrams: suggestion.estimateGrams,
      suggestedGrams: suggestion.suggestedGrams,
      amountLabel:
        pending.amountLabel || formatPortionLabel(suggestion.suggestedGrams),
    });
    setEntryKind(entry);
    setAssistStep("identity");
    setPhase("assist");
    setConfirmedGrams(null);
    setFormValues(emptyForm());

    if (options?.lookupOff && pending.allowOffCompare) {
      void lookupOffMatch(pending.name);
    } else {
      setOffMatch(null);
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

  function goNextFrom(current: AssistStepId) {
    const steps = buildAssistSteps(
      entryKind,
      Boolean(pendingFood?.allowOffCompare),
      Boolean(offMatch),
    );
    const idx = steps.indexOf(current);
    const next = steps[idx + 1];
    if (next) setAssistStep(next);
  }

  function goBackFrom(current: AssistStepId) {
    const idx = assistSteps.indexOf(current);
    if (idx <= 0) {
      resetAssist();
      return;
    }
    setAssistStep(assistSteps[idx - 1]!);
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
    const isOff = item.source === "openfoodfacts";
    const entry: CaptureEntryKind =
      tab === "barcode" ? "barcode" : tab === "manual" ? "search" : "text";

    startAssist(
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
          ? localizeAmount(item.servingSizeLabel, suggested)
          : formatPortionLabel(suggested),
        recognitionSubtitle: isOff
          ? "Produkt gefunden – bitte Menge bestätigen"
          : "KI-Schätzung – bitte Menge bestätigen",
        helperText:
          "Gib die gegessene Menge ein. Alle Nährwerte werden darauf umgerechnet.",
        portionConfidence,
        confidence: item.confidence ?? portionConfidence,
        allowOffCompare: !isOff,
      },
      entry,
      { lookupOff: !isOff },
    );
  }

  function onCameraAnalyzed(analysis: PortionAwareAnalysis, imagePath: string) {
    const suggested =
      analysis.estimatedPortionGrams && analysis.estimatedPortionGrams > 0
        ? analysis.estimatedPortionGrams
        : 250;
    const portion = confidenceLevel(analysis.portionConfidence);
    const name = localizeGermanLabel(analysis.name);

    startAssist(
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
          "Die Gramm-Angabe ist das geschätzte Gesamtgewicht aller Speisen. Passe sie bei Bedarf an – die Nährwerte werden umgerechnet.",
        portionConfidence: analysis.portionConfidence,
        confidence: analysis.confidence ?? null,
        allowOffCompare: true,
      },
      "photo",
      { lookupOff: true },
    );
  }

  function applyOffMatch(item: FoodLookupItem) {
    if (!pendingFood) return;
    const label = item.brand ? `${item.brand} ${item.name}` : item.name;
    const grams = confirmedGrams ?? pendingFood.suggestedGrams ?? 200;
    const next: PendingFood = {
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
      recognitionSubtitle: "OFF-Werte übernommen",
      allowOffCompare: false,
    };
    setPendingFood(next);
    setOffMatch(null);
    setFormValues(buildMealFromPending(next, grams));
    setAssistStep("confirm");
    toast.success("Open-Food-Facts-Werte übernommen");
  }

  function confirmPortion(grams: number) {
    if (!pendingFood) return;
    setConfirmedGrams(grams);
    setFormValues(buildMealFromPending(pendingFood, grams));
    const steps = buildAssistSteps(
      entryKind,
      Boolean(pendingFood.allowOffCompare),
      Boolean(offMatch),
    );
    const next = steps[steps.indexOf("portion") + 1];
    setAssistStep(next ?? "confirm");
  }

  function recalculatePortion(grams: number) {
    if (!pendingFood) {
      const previous = Number(
        String(formValues.portionSize || "")
          .match(/(\d+(?:[.,]\d+)?)/)?.[1]
          ?.replace(",", "."),
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

    setConfirmedGrams(grams);
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
      const data = await response.json().catch(() => ({}));
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
      const offline =
        (typeof navigator !== "undefined" && !navigator.onLine) ||
        (error instanceof TypeError &&
          /fetch|network|failed/i.test(error.message));
      if (offline) {
        enqueueOfflineMeal(values);
        toast.success("Offline gespeichert", {
          description: "Wird synchronisiert, sobald du wieder online bist.",
        });
        navigateFresh(router, "/dashboard");
        return;
      }
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
          Foto, Freitext, Barcode oder Suche – danach führt dich der Assistent
          bis zum Speichern.
        </p>
      </div>

      {phase === "assist" && pendingFood ? (
        <MealCaptureAssistant
          steps={assistSteps}
          current={assistStep}
          entry={entryKind}
          onBack={() => goBackFrom(assistStep)}
          onCancel={resetAssist}
        >
          {assistStep === "identity" ? (
            <CaptureIdentityStep
              entry={entryKind}
              name={pendingFood.name}
              brand={pendingFood.brand}
              amountLabel={pendingFood.amountLabel}
              subtitle={pendingFood.recognitionSubtitle}
              imagePath={pendingFood.imagePath}
              portionConfidence={pendingFood.portionConfidence}
              confidence={pendingFood.confidence}
              onNameChange={(name) =>
                setPendingFood({ ...pendingFood, name })
              }
              onContinue={() => goNextFrom("identity")}
            />
          ) : null}

          {assistStep === "portion" ? (
            <PortionPrompt
              key={`portion-${pendingFood.suggestedGrams}-${pendingFood.name}`}
              foodName={pendingFood.name}
              suggestedGrams={pendingFood.suggestedGrams}
              estimateGrams={pendingFood.rawEstimateGrams}
              helperText={pendingFood.helperText}
              portionConfidence={pendingFood.portionConfidence}
              confirmLabel="Weiter"
              onConfirm={(grams) => confirmPortion(grams)}
              onSkip={
                pendingFood.suggestedGrams
                  ? () => confirmPortion(pendingFood.suggestedGrams!)
                  : undefined
              }
            />
          ) : null}

          {assistStep === "source" ? (
            offMatch ? (
              <OffCompareCard
                aiName={pendingFood.name}
                aiPer100g={pendingFood.nutrientsPer100g}
                match={offMatch}
                onUseOff={applyOffMatch}
                onDismiss={() => {
                  setOffMatch(null);
                  setAssistStep("confirm");
                }}
              />
            ) : (
              <div className="space-y-4 rounded-2xl border border-border p-5 text-center">
                <p className="text-sm text-muted-foreground">
                  Kein Open-Food-Facts-Treffer – weiter mit der KI-Schätzung.
                </p>
                <button
                  type="button"
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                  onClick={() => setAssistStep("confirm")}
                >
                  Weiter zum Speichern
                </button>
              </div>
            )
          ) : null}

          {assistStep === "confirm" ? (
            <MealSaveConfirm
              key={`confirm-${formKey}`}
              values={formValues}
              busy={busy}
              onChange={setFormValues}
              onRecalculatePortion={recalculatePortion}
              onSave={() => saveMeal()}
              onEditDetails={() => setPhase("details")}
            />
          ) : null}
        </MealCaptureAssistant>
      ) : null}

      {phase === "details" ? (
        <Card>
          <CardHeader>
            <CardTitle>Alle Nährwerte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <MealForm
              key={`details-${formKey}`}
              initialValues={formValues}
              submitLabel="Speichern"
              onSubmit={saveMeal}
              busy={busy}
            />
            <button
              type="button"
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
              onClick={() => {
                setPhase("assist");
                setAssistStep("confirm");
              }}
            >
              Zurück zur Übersicht
            </button>
          </CardContent>
        </Card>
      ) : null}

      {phase === "capture" ? (
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
    </div>
  );
}

function localizeAmount(label: string, fallbackGrams: number) {
  const trimmed = label.trim();
  if (!trimmed) return formatPortionLabel(fallbackGrams);
  return trimmed;
}
