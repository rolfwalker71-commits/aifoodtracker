"use client";

import { useState } from "react";
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
import type { MealFormValues } from "@/types/meals";

type Props = {
  initialValues: MealFormValues;
  submitLabel?: string;
  onSubmit: (values: MealFormValues) => Promise<void>;
  busy?: boolean;
};

const numberFields: Array<{
  key: keyof MealFormValues;
  label: string;
  step?: string;
}> = [
  { key: "calories", label: "Kalorien (kcal)" },
  { key: "protein", label: "Protein (g)", step: "0.1" },
  { key: "carbs", label: "Kohlenhydrate (g)", step: "0.1" },
  { key: "fat", label: "Fett (g)", step: "0.1" },
  { key: "fiber", label: "Ballaststoffe (g)", step: "0.1" },
  { key: "sugar", label: "Zucker (g)", step: "0.1" },
  { key: "saturatedFat", label: "Gesättigte Fette (g)", step: "0.1" },
  { key: "sodium", label: "Natrium (mg)" },
  { key: "potassium", label: "Kalium (mg)" },
  { key: "vitaminA", label: "Vitamin A (µg)" },
  { key: "vitaminC", label: "Vitamin C (mg)", step: "0.1" },
  { key: "vitaminD", label: "Vitamin D (mg)", step: "0.1" },
  { key: "calcium", label: "Calcium (mg)" },
  { key: "iron", label: "Eisen (mg)", step: "0.1" },
];

export function MealForm({
  initialValues,
  submitLabel = "Speichern",
  onSubmit,
  busy,
}: Props) {
  const [values, setValues] = useState<MealFormValues>(initialValues);

  function update<K extends keyof MealFormValues>(
    key: K,
    value: MealFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form
      className="space-y-5"
      onSubmit={async (event) => {
        event.preventDefault();
        await onSubmit(values);
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
          <Label htmlFor="portionSize">Portionsgröße</Label>
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
          <Label htmlFor="consumedAt">Uhrzeit</Label>
          <Input
            id="consumedAt"
            type="datetime-local"
            required
            value={values.consumedAt}
            onChange={(e) => update("consumedAt", e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {numberFields.map((field) => (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={field.key}>{field.label}</Label>
            <Input
              id={field.key}
              type="number"
              min={0}
              step={field.step ?? "1"}
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
