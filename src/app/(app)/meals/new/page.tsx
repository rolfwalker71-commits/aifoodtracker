"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { CameraCapture } from "@/components/meals/camera-capture";
import { MealForm } from "@/components/meals/meal-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MealAnalysisResult } from "@/lib/openai";
import type { MealFormValues } from "@/types/meals";

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

export default function NewMealPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [formValues, setFormValues] = useState<MealFormValues>(emptyForm);
  const [tab, setTab] = useState("photo");
  const formKey = useMemo(
    () => `${formValues.name}-${formValues.imagePath ?? "manual"}-${tab}`,
    [formValues.name, formValues.imagePath, tab],
  );

  function applyAnalysis(analysis: MealAnalysisResult, imagePath: string) {
    setFormValues({
      ...emptyForm(),
      name: analysis.name,
      portionSize: analysis.portionSize,
      mealType: analysis.mealType,
      calories: analysis.calories,
      protein: analysis.protein,
      carbs: analysis.carbs,
      fat: analysis.fat,
      fiber: analysis.fiber,
      sugar: analysis.sugar,
      saturatedFat: analysis.saturatedFat,
      sodium: analysis.sodium,
      potassium: analysis.potassium,
      vitaminA: analysis.vitaminA,
      vitaminC: analysis.vitaminC,
      vitaminD: analysis.vitaminD,
      calcium: analysis.calcium,
      iron: analysis.iron,
      notes: analysis.notes ?? "",
      imagePath,
    });
    setTab("review");
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
      router.push("/dashboard");
      router.refresh();
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
          Foto analysieren oder manuell eingeben – Ergebnisse vor dem Speichern
          korrigieren.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="photo">Foto</TabsTrigger>
          <TabsTrigger value="manual">Manuell</TabsTrigger>
          <TabsTrigger value="review">Korrektur</TabsTrigger>
        </TabsList>

        <TabsContent value="photo" className="space-y-4">
          <CameraCapture onAnalyzed={applyAnalysis} />
        </TabsContent>

        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle>Manuelle Eingabe</CardTitle>
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
