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
  onSave: () => Promise<void>;
  onEditDetails?: () => void;
};

function ingredientLine(ingredients: MealIngredient[] = []) {
  if (!ingredients.length) return null;
  return ingredients
    .map((item) =>
      item.portionSize ? `${item.name} (${item.portionSize})` : item.name,
    )
    .join(" · ");
}

function gramsFromValues(values: MealFormValues) {
  return parsePortionGrams(values.portionSize || "") ?? null;
}

export function MealSaveConfirm({
  values,
  busy,
  onChange,
  onRecalculatePortion,
  onSave,
  onEditDetails,
}: Props) {
  const storedGrams = gramsFromValues(values);
  const [gramsInput, setGramsInput] = useState(
    storedGrams ? String(Math.round(storedGrams)) : "",
  );
  const [syncedPortion, setSyncedPortion] = useState(values.portionSize);
  if (values.portionSize !== syncedPortion) {
    setSyncedPortion(values.portionSize);
    setGramsInput(storedGrams ? String(Math.round(storedGrams)) : "");
  }
  const summary = ingredientLine(values.ingredients);

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
            onChange={(e) => onChange({ ...values, name: e.target.value })}
          />
        </div>

        <div
          className={`space-y-3 rounded-2xl border p-4 ${
            needsRecalculate
              ? "border-amber-500/50 bg-amber-500/10"
              : "border-border bg-muted/30"
          }`}
        >
          <div>
            <Label htmlFor="confirm-grams">Menge (g)</Label>
            <p className="mt-1 text-sm text-muted-foreground">
              Menge geändert? Danach unbedingt auf{" "}
              <span className="font-semibold text-foreground">Neuberechnen</span>{" "}
              tippen – sonst bleiben die alten Nährwerte.
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
            Neuberechnen
          </Button>
          {needsRecalculate ? (
            <p className="flex items-start gap-2 text-sm font-medium text-amber-800 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Menge wurde geändert – bitte jetzt „Neuberechnen“ drücken, bevor du
              speicherst.
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

        {summary ? (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Bestandteile: </span>
            {summary}
          </p>
        ) : null}

        <div className="flex flex-col gap-2">
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
