"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check, Pencil, RefreshCw } from "lucide-react";
import { MealType } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SwissDateTimeInput } from "@/components/ui/swiss-datetime-input";
import { MEAL_TYPE_LABELS } from "@/lib/nutrition";
import { parsePortionGrams } from "@/lib/portion";
import { formatNumber } from "@/lib/utils";
import type { MealFormValues, MealIngredient } from "@/types/meals";

type Props = {
  values: MealFormValues;
  busy?: boolean;
  onChange: (values: MealFormValues) => void;
  onRecalculatePortion: (grams: number) => void;
  onRecalculateIngredientGrams?: (index: number, grams: number) => void;
  onSave: () => Promise<void>;
  onEditDetails?: () => void;
};

function gramsFromValues(values: MealFormValues) {
  return parsePortionGrams(values.portionSize || "") ?? null;
}

function ingredientDisplayGrams(item: MealIngredient) {
  if (typeof item.grams === "number" && item.grams > 0) {
    return String(Math.round(item.grams));
  }
  const parsed = parsePortionGrams(item.portionSize || "");
  return parsed && parsed > 0 ? String(Math.round(parsed)) : "";
}

export function MealSaveConfirm({
  values,
  busy,
  onChange,
  onRecalculatePortion,
  onRecalculateIngredientGrams,
  onSave,
  onEditDetails,
}: Props) {
  const storedGrams = gramsFromValues(values);
  const [gramsInput, setGramsInput] = useState(
    storedGrams ? String(Math.round(storedGrams)) : "",
  );
  const [syncedPortion, setSyncedPortion] = useState(values.portionSize);
  const [ingredientInputs, setIngredientInputs] = useState<string[]>(() =>
    (values.ingredients ?? []).map(ingredientDisplayGrams),
  );
  const [syncedIngredients, setSyncedIngredients] = useState(
    values.ingredients ?? [],
  );

  if (values.portionSize !== syncedPortion) {
    setSyncedPortion(values.portionSize);
    setGramsInput(storedGrams ? String(Math.round(storedGrams)) : "");
  }
  if (values.ingredients !== syncedIngredients) {
    setSyncedIngredients(values.ingredients ?? []);
    setIngredientInputs((values.ingredients ?? []).map(ingredientDisplayGrams));
  }

  const ingredients = values.ingredients ?? [];

  const inputGrams = useMemo(() => {
    const grams = Number(String(gramsInput).replace(",", "."));
    return Number.isFinite(grams) && grams > 0 ? grams : null;
  }, [gramsInput]);

  const needsRecalculate = Boolean(
    inputGrams &&
      storedGrams &&
      Math.round(inputGrams) !== Math.round(storedGrams),
  );

  function applyGrams() {
    if (!inputGrams) return;
    onRecalculatePortion(inputGrams);
  }

  function applyIngredientGrams(index: number) {
    if (!onRecalculateIngredientGrams) return;
    const raw = ingredientInputs[index] ?? "";
    const grams = Number(String(raw).replace(",", "."));
    if (!Number.isFinite(grams) || grams <= 0) return;
    const current =
      ingredients[index]?.grams && ingredients[index]!.grams! > 0
        ? ingredients[index]!.grams!
        : parsePortionGrams(ingredients[index]?.portionSize || "") || 0;
    if (Math.round(grams) === Math.round(current)) return;
    onRecalculateIngredientGrams(index, grams);
  }

  return (
    <Card className="border-primary/25">
      <CardHeader>
        <CardTitle>Bereit zum Speichern</CardTitle>
        <p className="text-sm text-muted-foreground">
          Nährwerte wurden auf deine Menge umgerechnet und werden mitgespeichert.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-2xl bg-muted/50 px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">Kalorien</p>
          <p className="mt-1 font-display text-5xl font-bold tracking-tight">
            {formatNumber(values.calories, 0)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">kcal</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-name">Gericht</Label>
          <Input
            id="confirm-name"
            value={values.name}
            className="break-words"
            onChange={(e) => onChange({ ...values, name: e.target.value })}
            onFocus={(e) =>
              e.currentTarget.scrollIntoView({
                behavior: "smooth",
                block: "center",
              })
            }
          />
        </div>

        {ingredients.length > 0 && onRecalculateIngredientGrams ? (
          <div className="space-y-3 rounded-2xl border border-border bg-muted/30 p-4">
            <div>
              <Label>Zutatenmengen (g)</Label>
              <p className="mt-1 text-sm text-muted-foreground">
                Einzelne Mengen ändern – Nährwerte und Gesamtgewicht werden
                neu berechnet.
              </p>
            </div>
            <div className="space-y-2">
              {ingredients.map((item, index) => (
                <div
                  key={`${item.name}-${index}`}
                  className="grid grid-cols-[1fr_5.5rem_auto] items-center gap-2"
                >
                  <p className="min-w-0 truncate text-sm font-medium">
                    {item.name}
                  </p>
                  <Input
                    inputMode="decimal"
                    aria-label={`${item.name} in Gramm`}
                    value={ingredientInputs[index] ?? ""}
                    onChange={(e) => {
                      const next = [...ingredientInputs];
                      next[index] = e.target.value;
                      setIngredientInputs(next);
                    }}
                    onBlur={() => applyIngredientGrams(index)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        applyIngredientGrams(index);
                      }
                    }}
                    placeholder="g"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="px-2"
                    onClick={() => applyIngredientGrams(index)}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Gesamt:{" "}
              <span className="font-medium text-foreground">
                {values.portionSize?.trim() || "–"}
              </span>
            </p>
          </div>
        ) : null}

        <div
          className={`space-y-3 rounded-2xl border p-4 ${
            needsRecalculate
              ? "border-amber-500/50 bg-amber-500/10"
              : "border-border bg-muted/30"
          }`}
        >
          <div>
            <Label htmlFor="confirm-grams">Gesamtmenge (g)</Label>
            <p className="mt-1 text-sm text-muted-foreground">
              Skaliert alle Zutaten proportional. Für einzelne Zutaten die Felder
              oben nutzen.
            </p>
          </div>
          <Input
            id="confirm-grams"
            inputMode="decimal"
            value={gramsInput}
            onChange={(e) => setGramsInput(e.target.value)}
            placeholder="z. B. 180"
          />
          <Button
            type="button"
            size="lg"
            className="w-full"
            variant={needsRecalculate ? "default" : "outline"}
            disabled={!inputGrams}
            onClick={applyGrams}
          >
            <RefreshCw className="h-4 w-4" />
            Gesamt neu berechnen
          </Button>
          {needsRecalculate ? (
            <p className="flex items-start gap-2 text-sm font-medium text-amber-800 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Gesamtmenge geändert – bitte „Gesamt neu berechnen“ tippen.
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Kategorie</Label>
          <Select
            value={values.mealType}
            onValueChange={(value) =>
              onChange({ ...values, mealType: value as MealType })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(MEAL_TYPE_LABELS) as MealType[]).map((type) => (
                <SelectItem key={type} value={type}>
                  {MEAL_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <SwissDateTimeInput
          id="confirm-time"
          value={values.consumedAt}
          onChange={(consumedAt) => onChange({ ...values, consumedAt })}
          required
        />

        <div className="flex flex-col gap-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={busy || !values.name.trim() || needsRecalculate}
            onClick={() => void onSave()}
          >
            <Check className="h-4 w-4" />
            {busy
              ? "Speichern…"
              : needsRecalculate
                ? "Zuerst neuberechnen"
                : "Speichern"}
          </Button>
          {onEditDetails ? (
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={onEditDetails}
            >
              <Pencil className="h-4 w-4" />
              Alle Nährwerte bearbeiten
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
