"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Plus, RefreshCw, Trash2 } from "lucide-react";
import { MealType } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SwissDateTimeInput } from "@/components/ui/swiss-datetime-input";
import { MEAL_TYPE_LABELS } from "@/lib/nutrition";
import { parsePortionGrams, formatPortionLabel } from "@/lib/portion";
import type { MealFormValues, MealIngredient } from "@/types/meals";

type Props = {
  initialValues: MealFormValues;
  submitLabel?: string;
  onSubmit: (values: MealFormValues) => Promise<void>;
  busy?: boolean;
  /** When set, changing Menge and confirming rescales nutrients via parent. */
  onPortionGramsChange?: (grams: number) => void;
  onIngredientGramsChange?: (index: number, grams: number) => void;
};

const numberFields: Array<{
  key: keyof MealFormValues;
  label: string;
}> = [
  { key: "calories", label: "Kalorien (kcal)" },
  { key: "protein", label: "Protein (g)" },
  { key: "carbs", label: "Kohlenhydrate (g)" },
  { key: "fat", label: "Fett (g)" },
  { key: "fiber", label: "Ballaststoffe (g)" },
  { key: "sugar", label: "Zucker (g)" },
  { key: "saturatedFat", label: "Gesättigte Fette (g)" },
  { key: "sodium", label: "Natrium (mg)" },
  { key: "potassium", label: "Kalium (mg)" },
  { key: "vitaminA", label: "Vitamin A (µg)" },
  { key: "vitaminC", label: "Vitamin C (mg)" },
  { key: "vitaminD", label: "Vitamin D (µg)" },
  { key: "calcium", label: "Kalzium (mg)" },
  { key: "iron", label: "Eisen (mg)" },
];

export function MealForm({
  initialValues,
  submitLabel = "Speichern",
  onSubmit,
  busy,
  onPortionGramsChange,
  onIngredientGramsChange,
}: Props) {
  const [values, setValues] = useState<MealFormValues>({
    ...initialValues,
    ingredients: initialValues.ingredients ?? [],
  });
  const baselineGrams =
    parsePortionGrams(initialValues.portionSize || "") ?? null;
  const [gramsInput, setGramsInput] = useState(
    baselineGrams ? String(Math.round(baselineGrams)) : "",
  );

  const ingredients = values.ingredients ?? [];
  const inputGrams = useMemo(() => {
    const grams = Number(String(gramsInput).replace(",", "."));
    return Number.isFinite(grams) && grams > 0 ? grams : null;
  }, [gramsInput]);
  const currentGrams = parsePortionGrams(values.portionSize || "");
  const needsRecalculate = Boolean(
    onPortionGramsChange &&
      inputGrams &&
      currentGrams &&
      Math.round(inputGrams) !== Math.round(currentGrams),
  );

  function update<K extends keyof MealFormValues>(
    key: K,
    value: MealFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function applyPortionRecalculate() {
    if (!onPortionGramsChange || !inputGrams) return;
    onPortionGramsChange(inputGrams);
  }

  function updateIngredient(
    index: number,
    key: keyof MealIngredient,
    value: string,
  ) {
    update(
      "ingredients",
      ingredients.map((item, i) => {
        if (i !== index) return item;
        if (key === "grams") {
          const grams = value.trim() ? Number(value.replace(",", ".")) : null;
          const next =
            typeof grams === "number" && Number.isFinite(grams) && grams > 0
              ? grams
              : null;
          return {
            ...item,
            grams: next,
            portionSize: next ? formatPortionLabel(next) : item.portionSize,
          };
        }
        return { ...item, [key]: value };
      }),
    );
  }

  function commitIngredientGrams(index: number) {
    if (!onIngredientGramsChange) return;
    const item = ingredients[index];
    if (!item?.grams || item.grams <= 0) return;
    onIngredientGramsChange(index, item.grams);
  }

  function addIngredient() {
    update("ingredients", [
      ...ingredients,
      { name: "", portionSize: "", grams: null },
    ]);
  }

  function removeIngredient(index: number) {
    update(
      "ingredients",
      ingredients.filter((_, i) => i !== index),
    );
  }

  return (
    <form
      className="space-y-6"
      onSubmit={async (event) => {
        event.preventDefault();
        await onSubmit({
          ...values,
          ingredients: ingredients.filter((item) => item.name.trim()),
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">Gericht</Label>
          <Input
            id="name"
            required
            value={values.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="z. B. Avocado Toast"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="portionSize">Portionsgrösse gesamt</Label>
          <Input
            id="portionSize"
            value={values.portionSize ?? ""}
            onChange={(e) => update("portionSize", e.target.value)}
            placeholder="z. B. 1 Teller / 250 g"
          />
        </div>
        {onPortionGramsChange ? (
          <div
            className={`space-y-3 rounded-2xl border p-4 sm:col-span-2 ${
              needsRecalculate
                ? "border-warning/50 bg-warning/10"
                : "border-border bg-muted/30"
            }`}
          >
            <div>
              <Label htmlFor="portion-grams-edit">Menge (g)</Label>
              <p className="mt-1 text-sm text-muted-foreground">
                Nach dem Ändern auf{" "}
                <span className="font-semibold text-foreground">
                  Neuberechnen
                </span>{" "}
                tippen, damit Kalorien und Nährwerte angepasst werden.
              </p>
            </div>
            <Input
              id="portion-grams-edit"
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
              onClick={applyPortionRecalculate}
            >
              <RefreshCw className="h-4 w-4" />
              Neuberechnen
            </Button>
            {needsRecalculate ? (
              <p className="flex items-start gap-2 text-sm font-medium text-warning-foreground">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                Menge geändert – bitte „Neuberechnen“ drücken, bevor du
                speicherst.
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="space-y-2">
          <Label>Kategorie</Label>
          <Select
            value={values.mealType}
            onValueChange={(value) => update("mealType", value as MealType)}
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
        <div className="sm:col-span-2">
          <SwissDateTimeInput
            id="consumedAt"
            value={values.consumedAt}
            onChange={(consumedAt) => update("consumedAt", consumedAt)}
            required
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <Label>Hauptbestandteile</Label>
            <p className="text-xs text-muted-foreground">
              Von der KI erkannt bzw. typisch – mit geschätzter Portionsgrösse
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
            <Plus className="h-4 w-4" />
            Zutat
          </Button>
        </div>

        {ingredients.length === 0 ? (
          <p className="rounded-xl border border-dashed px-3 py-4 text-sm text-muted-foreground">
            Noch keine Bestandteile. Nach Foto-/KI-Analyse erscheinen sie hier.
          </p>
        ) : (
          <div className="space-y-2">
            {ingredients.map((item, index) => (
              <div
                key={`ingredient-${index}`}
                className="grid grid-cols-[minmax(0,1fr)_4.75rem_auto] gap-2"
              >
                <Input
                  aria-label={`Zutat ${index + 1}`}
                  value={item.name}
                  onChange={(e) =>
                    updateIngredient(index, "name", e.target.value)
                  }
                  placeholder="z. B. Spaghetti"
                />
                <Input
                  aria-label={`Gramm Zutat ${index + 1}`}
                  inputMode="decimal"
                  value={item.grams ?? ""}
                  onChange={(e) =>
                    updateIngredient(index, "grams", e.target.value)
                  }
                  onBlur={() => commitIngredientGrams(index)}
                  placeholder="g"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Zutat entfernen"
                  onClick={() => removeIngredient(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {numberFields.map((field) => (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={field.key}>{field.label}</Label>
            <Input
              id={field.key}
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              value={Number(values[field.key] ?? 0)}
              onChange={(e) =>
                update(field.key, Number(e.target.value || 0) as never)
              }
            />
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notizen</Label>
        <Textarea
          id="notes"
          value={values.notes ?? ""}
          onChange={(e) => update("notes", e.target.value)}
          placeholder="Optional"
        />
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={busy || needsRecalculate}
        size="lg"
      >
        {busy
          ? "Speichern…"
          : needsRecalculate
            ? "Zuerst neuberechnen"
            : submitLabel}
      </Button>
    </form>
  );
}
