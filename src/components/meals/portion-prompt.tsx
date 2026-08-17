"use client";

import { useMemo, useState } from "react";
import { Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  /** Rohschätzung vor Confidence-Mix – für Hinweis „KI schätzte …“. */
  estimateGrams?: number | null;
  helperText?: string;
  confirmLabel?: string;
  portionConfidence?: number | null;
  onConfirm: (grams: number, label: string) => void;
  onSkip?: () => void;
};

const BASE_QUICK = [100, 150, 200, 250, 300, 400];

export function PortionPrompt({
  foodName,
  suggestedGrams,
  estimateGrams,
  helperText,
  confirmLabel = "Weiter",
  portionConfidence,
  onConfirm,
  onSkip,
}: Props) {
  const [value, setValue] = useState(
    suggestedGrams ? String(Math.round(suggestedGrams)) : "",
  );
  const portion = confidenceLevel(portionConfidence);
  const suggestedRounded =
    typeof suggestedGrams === "number" && suggestedGrams > 0
      ? Math.round(suggestedGrams)
      : null;
  const estimateRounded =
    typeof estimateGrams === "number" && estimateGrams > 0
      ? Math.round(estimateGrams)
      : null;
  const showEstimateHint =
    estimateRounded !== null &&
    suggestedRounded !== null &&
    estimateRounded !== suggestedRounded;

  const quickChips = useMemo(() => {
    const set = new Set(BASE_QUICK);
    if (suggestedRounded) set.add(suggestedRounded);
    return Array.from(set).sort((a, b) => a - b);
  }, [suggestedRounded]);

  function submit() {
    const grams = parsePortionGrams(value);
    if (!grams || grams <= 0) return;
    onConfirm(grams, `${Math.round(grams)} g`);
  }

  return (
    <div
      className={cn(
        "space-y-6 rounded-2xl border p-5 sm:p-6",
        portion.key === "low"
          ? "border-warning/50 bg-warning/10"
          : "border-border bg-background",
      )}
    >
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Scale className="h-8 w-8" aria-hidden />
      </div>

      <div className="space-y-1 text-center">
        <p className="text-sm text-muted-foreground break-words">{foodName}</p>
        <p className="font-display text-4xl font-bold tracking-tight tabular-nums sm:text-5xl">
          {value || "–"}{" "}
          <span className="text-2xl text-muted-foreground sm:text-3xl">g</span>
        </p>
        {showEstimateHint ? (
          <p className="text-xs text-muted-foreground">
            KI schätzte {estimateRounded} g · Vorschlag an Sicherheit angepasst
            ({suggestedRounded} g)
          </p>
        ) : null}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        {helperText ||
          "Wie viel hast du gegessen? Die Nährwerte werden danach umgerechnet."}
      </p>

      {typeof portionConfidence === "number" ? (
        <p
          className={cn(
            "rounded-xl px-3 py-2 text-sm",
            portion.key === "high" && "bg-primary/10",
            portion.key === "medium" && "bg-warning/10",
            portion.key === "low" && "bg-destructive/10 font-medium",
          )}
        >
          Menge {portion.label} ({confidencePercent(portionConfidence)} %).{" "}
          {portion.detail}
        </p>
      ) : null}

      <div className="flex flex-wrap justify-center gap-2">
        {quickChips.map((grams) => (
          <Button
            key={grams}
            type="button"
            size="sm"
            variant={value === String(grams) ? "default" : "outline"}
            onClick={() => setValue(String(grams))}
          >
            {grams}
          </Button>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="portion-grams">Menge in Gramm</Label>
        <Input
          id="portion-grams"
          inputMode="decimal"
          enterKeyHint="done"
          autoComplete="off"
          placeholder="z. B. 220"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={(e) =>
            e.currentTarget.scrollIntoView({
              behavior: "smooth",
              block: "center",
            })
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
        />
      </div>

      <div className="flex flex-col gap-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <Button type="button" size="lg" className="h-12 w-full" onClick={submit}>
          {confirmLabel}
        </Button>
        {onSkip ? (
          <Button type="button" variant="ghost" onClick={onSkip}>
            Vorschlag übernehmen
          </Button>
        ) : null}
      </div>
    </div>
  );
}
