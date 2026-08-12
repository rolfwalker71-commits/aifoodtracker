"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
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
import { MEAL_TYPE_LABELS } from "@/lib/nutrition";
import type { MealFormValues, MealIngredient } from "@/types/meals";

type Props = {
  initialValues: MealFormValues;
  submitLabel?: string;
  onSubmit: (values: MealFormValues) => Promise<void>;
  busy?: boolean;
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
  { key: "vitaminD", label: "Vitamin D (mg)" },
  { key: "calcium", label: "Kalzium (mg)" },
  { key: "iron", label: "Eisen (mg)" },
];

export function MealForm({
  initialValues,
  submitLabel = "Speichern",
  onSubmit,
  busy,
}: Props) {
  const [values, setValues] = useState<MealFormValues>({
    ...initialValues,
    ingredients: initialValues.ingredients ?? [],
  });

  const ingredients = values.ingredients ?? [];

  function update<K extends keyof MealFormValues>(
    key: K,
    value: MealFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
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
          const grams = value.trim() ? Number(value) : null;
          return {
            ...item,
            grams:
              typeof grams === "number" && Number.isFinite(grams) && grams > 0
                ? grams
                : null,
          };
        }
        return { ...item, [key]: value };
      }),
    );
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
      className="space-y-5"
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
        <div className="space-y-2">
          <Label htmlFor="portionSize">Portionsgröße gesamt</Label>
          <Input
            id="portionSize"
            value={values.portionSize ?? ""}
            onChange={(e) => update("portionSize", e.target.value)}
            placeholder="z. B. 1 Teller / 250 g"
          />
        </div>
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
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="consumedAt">Datum & Uhrzeit</Label>
          <Input
            id="consumedAt"
            type="datetime-local"
            required
            value={values.consumedAt}
            onChange={(e) => update("consumedAt", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <Label>Hauptbestandteile</Label>
            <p className="text-xs text-muted-foreground">
              Von der KI erkannt bzw. typisch – mit geschätzter Portionsgröße
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
                className="grid grid-cols-[1fr_7rem_auto] gap-2 sm:grid-cols-[1fr_9rem_5.5rem_auto]"
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
                  aria-label={`Portion Zutat ${index + 1}`}
                  value={item.portionSize}
                  onChange={(e) =>
                    updateIngredient(index, "portionSize", e.target.value)
                  }
                  placeholder="180 g"
                />
                <Input
                  className="hidden sm:block"
                  aria-label={`Gramm Zutat ${index + 1}`}
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  value={item.grams ?? ""}
                  onChange={(e) =>
                    updateIngredient(index, "grams", e.target.value)
                  }
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

      <Button type="submit" className="w-full" disabled={busy} size="lg">
        {busy ? "Speichern…" : submitLabel}
      </Button>
    </form>
  );
}
