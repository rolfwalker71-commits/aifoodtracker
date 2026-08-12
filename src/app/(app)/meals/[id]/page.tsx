"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { MealDetailViewer } from "@/components/meals/meal-detail-viewer";
import { MealForm } from "@/components/meals/meal-form";
import { MealSaveConfirm } from "@/components/meals/meal-save-confirm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toFormDateTime } from "@/lib/datetime";
import { localizeGermanLabel } from "@/lib/de-labels";
import { navigateFresh } from "@/lib/fresh-navigate";
import {
  parseStoredIngredients,
  scaleIngredients,
} from "@/lib/meal-ingredients";
import type { NutritionGoals, NutrientTotals } from "@/lib/nutrition";
import {
  formatPortionLabel,
  parsePortionGrams,
  rescaleNutrientTotals,
} from "@/lib/portion";
import { cn } from "@/lib/utils";
import type { MealFormValues } from "@/types/meals";

function isSameAppDay(isoOrForm: string) {
  const mealDay = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(isoOrForm));
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return mealDay === today;
}

function resolveCurrentGrams(values: MealFormValues): number | null {
  const fromLabel = parsePortionGrams(values.portionSize || "");
  if (fromLabel && fromLabel > 0) return fromLabel;

  const ingredientTotal = (values.ingredients ?? []).reduce(
    (sum, item) => sum + (item.grams && item.grams > 0 ? item.grams : 0),
    0,
  );
  return ingredientTotal > 0 ? ingredientTotal : null;
}

export default function MealDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [values, setValues] = useState<MealFormValues | null>(null);
  const [goals, setGoals] = useState<NutritionGoals | null>(null);
  const [dayTotals, setDayTotals] = useState<Pick<
    NutrientTotals,
    "calories" | "protein" | "carbs" | "fat" | "fiber"
  > | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"view" | "simple" | "details">("view");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [mealResponse, statsResponse] = await Promise.all([
        fetch(`/api/meals/${params.id}`, { cache: "no-store" }),
        fetch("/api/stats?range=day", { cache: "no-store" }),
      ]);

      const mealData = await mealResponse.json();
      if (!mealResponse.ok) {
        toast.error(mealData.error || "Mahlzeit nicht gefunden");
        navigateFresh(router, "/meals");
        return;
      }

      if (!cancelled) {
        const meal = mealData.meal;
        setIsFavorite(Boolean(meal.isFavorite));
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

      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        if (!cancelled && stats.goals) {
          setGoals(stats.goals as NutritionGoals);
        }
        if (!cancelled && stats.totals) {
          setDayTotals({
            calories: stats.totals.calories ?? 0,
            protein: stats.totals.protein ?? 0,
            carbs: stats.totals.carbs ?? 0,
            fat: stats.totals.fat ?? 0,
            fiber: stats.totals.fiber ?? 0,
          });
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [params.id, router]);

  function recalculatePortion(grams: number) {
    if (!values) return;
    const previous = resolveCurrentGrams(values);
    if (!previous || previous <= 0) {
      toast.error(
        "Aktuelle Menge in Gramm nicht erkennbar. Bitte zuerst z. B. „250 g“ setzen.",
      );
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
        error instanceof Error
          ? error.message
          : "Aktualisierung fehlgeschlagen",
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggleFavorite() {
    setBusy(true);
    try {
      const next = !isFavorite;
      const response = await fetch(`/api/meals/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ isFavorite: next }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Favorit fehlgeschlagen");
      }
      setIsFavorite(next);
      toast.success(next ? "Als Favorit gespeichert" : "Favorit entfernt");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Favorit fehlgeschlagen",
      );
    } finally {
      setBusy(false);
    }
  }

  async function duplicateMeal() {
    setBusy(true);
    try {
      const response = await fetch(`/api/meals/${params.id}/duplicate`, {
        method: "POST",
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Kopie fehlgeschlagen");
      }
      toast.success("Nochmal gespeichert");
      navigateFresh(router, "/dashboard");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Kopie fehlgeschlagen",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!values) {
    return <p className="text-sm text-muted-foreground">Lade Mahlzeit…</p>;
  }

  if (mode === "view") {
    return (
      <div
        className={cn(
          "flex w-full flex-col bg-background",
          // PWA/mobile: pin exactly between sticky header and bottom nav
          "max-md:fixed max-md:inset-x-0 max-md:top-14 max-md:bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] max-md:z-20",
          // Desktop: in-flow, taller stage
          "md:relative md:mx-auto md:h-[min(85vh,52rem)] md:max-w-2xl md:gap-4",
        )}
      >
        <div className="shrink-0 px-4 pt-2 md:px-0 md:pt-0">
          <h1 className="font-display text-xl font-bold tracking-tight md:text-3xl">
            Mahlzeit
          </h1>
          <p className="hidden text-sm text-muted-foreground md:block">
            Wischen: Zutaten, Coach, Heute & Ziele
          </p>
        </div>
        <div className="min-h-0 flex-1">
          <MealDetailViewer
            values={values}
            goals={goals}
            dayTotals={dayTotals}
            mealIsToday={isSameAppDay(values.consumedAt)}
            isFavorite={isFavorite}
            busy={busy}
            onEdit={() => setMode("simple")}
            onToggleFavorite={() => void toggleFavorite()}
            onDuplicate={() => void duplicateMeal()}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-3 md:space-y-5">
      <div className="md:space-y-1">
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
          Mahlzeit bearbeiten
        </h1>
        <p className="text-sm text-muted-foreground">
          Menge ändern → neu berechnen → speichern
        </p>
      </div>

      {mode === "simple" ? (
        <>
          <MealSaveConfirm
            values={values}
            busy={busy}
            onChange={setValues}
            onRecalculatePortion={recalculatePortion}
            onSave={() => onSubmit(values)}
            onEditDetails={() => setMode("details")}
          />
          <button
            type="button"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => setMode("view")}
          >
            Zurück zur Übersicht
          </button>
        </>
      ) : null}

      {mode === "details" ? (
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
              Zurück zur einfachen Bearbeitung
            </button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
