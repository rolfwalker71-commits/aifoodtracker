"use client";

import { Check, Package, Scale, Sparkles, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  confidenceLevel,
  confidencePercent,
} from "@/lib/confidence";
import { cn } from "@/lib/utils";

export type AssistStepId = "identity" | "portion" | "source" | "confirm";
export type CaptureEntryKind = "photo" | "text" | "barcode" | "search";

const STEP_META: Record<
  AssistStepId,
  { label: string; title: string; subtitle: string }
> = {
  identity: {
    label: "Erkannt",
    title: "Erkannt",
    subtitle: "Stimmt Gericht bzw. Produkt?",
  },
  portion: {
    label: "Menge",
    title: "Menge prüfen",
    subtitle: "Wie viel hast du gegessen?",
  },
  source: {
    label: "Quelle",
    title: "Quelle wählen",
    subtitle: "KI-Schätzung oder Produktdatenbank?",
  },
  confirm: {
    label: "Speichern",
    title: "Speichern",
    subtitle: "Passt alles?",
  },
};

export function buildAssistSteps(
  entry: CaptureEntryKind,
  allowOffCompare: boolean,
  hasOffMatch: boolean,
): AssistStepId[] {
  const steps: AssistStepId[] = ["identity", "portion"];
  if (allowOffCompare && hasOffMatch) {
    steps.push("source");
  }
  steps.push("confirm");
  // Barcode/Suche: identity label still "Erkannt" but copy adapts in identity body
  void entry;
  return steps;
}

export function stepMeta(id: AssistStepId, entry: CaptureEntryKind) {
  if (id === "identity" && (entry === "barcode" || entry === "search")) {
    return {
      label: "Produkt",
      title: "Produkt",
      subtitle: "Ist das das richtige Produkt?",
    };
  }
  return STEP_META[id];
}

type ShellProps = {
  steps: AssistStepId[];
  current: AssistStepId;
  entry: CaptureEntryKind;
  onBack?: () => void;
  onCancel: () => void;
  children: React.ReactNode;
};

export function MealCaptureAssistant({
  steps,
  current,
  entry,
  onBack,
  onCancel,
  children,
}: ShellProps) {
  const index = Math.max(0, steps.indexOf(current));
  const meta = stepMeta(current, entry);

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Schritt {index + 1} von {steps.length}
          </p>
          <button
            type="button"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            onClick={onCancel}
          >
            Abbrechen
          </button>
        </div>
        <ol className="flex items-center gap-1 sm:gap-2">
          {steps.map((id, i) => {
            const done = i < index;
            const active = i === index;
            return (
              <li key={id} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <div className="flex w-full items-center">
                  <span
                    className={cn(
                      "mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold",
                      done && "bg-primary text-primary-foreground",
                      active &&
                        "border-2 border-primary bg-background text-primary",
                      !done &&
                        !active &&
                        "border border-border bg-muted/40 text-muted-foreground",
                    )}
                    aria-current={active ? "step" : undefined}
                  >
                    {done ? <Check className="h-4 w-4" /> : i + 1}
                  </span>
                </div>
                <span
                  className={cn(
                    "max-w-full truncate text-[10px] sm:text-xs",
                    active
                      ? "font-medium text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {stepMeta(id, entry).label}
                </span>
              </li>
            );
          })}
        </ol>
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {meta.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{meta.subtitle}</p>
        </div>
      </div>

      {children}

      {onBack ? (
        <button
          type="button"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          onClick={onBack}
        >
          Zurück
        </button>
      ) : null}
    </div>
  );
}

type IdentityProps = {
  entry: CaptureEntryKind;
  name: string;
  brand?: string | null;
  amountLabel?: string | null;
  subtitle?: string | null;
  imagePath?: string | null;
  portionConfidence?: number | null;
  confidence?: number | null;
  onContinue: () => void;
  onNameChange?: (name: string) => void;
};

export function CaptureIdentityStep({
  entry,
  name,
  brand,
  amountLabel,
  subtitle,
  imagePath,
  portionConfidence,
  confidence,
  onContinue,
  onNameChange,
}: IdentityProps) {
  const dish =
    typeof confidence === "number" ? confidenceLevel(confidence) : null;
  const portion = confidenceLevel(portionConfidence);
  const isProduct = entry === "barcode" || entry === "search";

  return (
    <div className="space-y-5 rounded-2xl border border-border bg-background p-5 sm:p-6">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        {isProduct ? (
          <Package className="h-9 w-9" />
        ) : (
          <Utensils className="h-9 w-9" />
        )}
      </div>

      {imagePath ? (
        <div className="mx-auto h-28 w-28 overflow-hidden rounded-2xl bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagePath}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
          />
        </div>
      ) : null}

      {onNameChange ? (
        <label className="block space-y-2 text-center">
          <span className="text-xs text-muted-foreground">Bezeichnung</span>
          <input
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-center font-display text-xl font-bold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
          />
        </label>
      ) : (
        <h3 className="text-center font-display text-2xl font-bold leading-snug break-words sm:text-3xl">
          {name}
        </h3>
      )}

      {brand ? (
        <p className="text-center text-sm text-muted-foreground">{brand}</p>
      ) : null}

      {amountLabel ? (
        <p className="text-center text-lg font-semibold text-primary break-words">
          {amountLabel}
        </p>
      ) : null}

      <div className="mx-auto flex w-full max-w-sm flex-col gap-2">
        {dish ? (
          <ConfidenceRow
            label={`Gericht ${dish.label}`}
            detail={`${confidencePercent(dish.score)} %`}
            level={dish.key}
          />
        ) : null}
        <ConfidenceRow
          label={`Menge ${portion.label}`}
          detail={`${confidencePercent(portion.score)} % · ${portion.detail}`}
          level={portion.key}
        />
      </div>

      {subtitle ? (
        <p className="text-center text-sm text-muted-foreground break-words">
          {subtitle}
        </p>
      ) : null}

      <Button type="button" size="lg" className="h-12 w-full" onClick={onContinue}>
        Weiter zur Menge
      </Button>
    </div>
  );
}

function ConfidenceRow({
  label,
  detail,
  level,
}: {
  label: string;
  detail: string;
  level: "high" | "medium" | "low";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl px-4 py-2.5 text-left text-sm",
        level === "high" &&
          "bg-emerald-500/15 text-emerald-900 dark:text-emerald-100",
        level === "medium" &&
          "bg-amber-500/15 text-amber-900 dark:text-amber-100",
        level === "low" &&
          "bg-orange-500/20 text-orange-950 dark:text-orange-100",
      )}
    >
      <p className="font-semibold break-words">{label}</p>
      <p className="mt-0.5 break-words opacity-90">{detail}</p>
    </div>
  );
}

export function CaptureStepIcon({
  step,
}: {
  step: AssistStepId;
}) {
  if (step === "portion") return <Scale className="h-5 w-5" />;
  if (step === "source") return <Sparkles className="h-5 w-5" />;
  if (step === "confirm") return <Check className="h-5 w-5" />;
  return <Utensils className="h-5 w-5" />;
}
