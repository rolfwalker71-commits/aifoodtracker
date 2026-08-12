"use client";

import { useState } from "react";
import { Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  confidenceLevel,
  confidencePercent,
} from "@/lib/confidence";
import { parsePortionGrams } from "@/lib/portion";
import { cn } from "@/lib/utils";

type Props = {
  foodName: string;
  suggestedGrams?: number | null;
  helperText?: string;
  confirmLabel?: string;
  portionConfidence?: number | null;
  onConfirm: (grams: number, label: string) => void;
  onSkip?: () => void;
};

const QUICK = [100, 150, 200, 250, 300, 400];

export function PortionPrompt({
  foodName,
  suggestedGrams,
  helperText,
  confirmLabel = "Berechnen",
  portionConfidence,
  onConfirm,
  onSkip,
}: Props) {
  const [value, setValue] = useState(
    suggestedGrams ? String(Math.round(suggestedGrams)) : "",
  );
  const portion = confidenceLevel(portionConfidence);

  function submit() {
    const grams = parsePortionGrams(value);
    if (!grams || grams <= 0) return;
    onConfirm(grams, `${Math.round(grams)} g`);
  }

  return (
    <Card
      className={cn(
        "border-primary/30 bg-primary/5",
        portion.key === "low" && "border-amber-500/50 bg-amber-500/10",
      )}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Scale className="h-4 w-4 text-primary" />
          Portionsgrösse für {foodName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {helperText ||
            "Wie viel hast du gegessen? Die Nährwerte werden danach automatisch berechnet."}
        </p>
        {typeof portionConfidence === "number" ? (
          <p
            className={cn(
              "rounded-xl px-3 py-2 text-sm",
              portion.key === "high" && "bg-emerald-500/10",
              portion.key === "medium" && "bg-amber-500/10",
              portion.key === "low" && "bg-orange-500/15 font-medium",
            )}
          >
            Unsicherheit Menge: {portion.label} (
            {confidencePercent(portionConfidence)} %). {portion.detail}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {QUICK.map((grams) => (
            <Button
              key={grams}
              type="button"
              size="sm"
              variant={value === String(grams) ? "default" : "outline"}
              onClick={() => setValue(String(grams))}
            >
              {grams} g
            </Button>
          ))}
        </div>
        <div className="space-y-2">
          <Label htmlFor="portion-grams">Menge in Gramm</Label>
          <Input
            id="portion-grams"
            inputMode="decimal"
            placeholder="z. B. 220"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" className="flex-1" onClick={submit}>
            {confirmLabel}
          </Button>
          {onSkip && (
            <Button type="button" variant="outline" onClick={onSkip}>
              Schätzung behalten
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
