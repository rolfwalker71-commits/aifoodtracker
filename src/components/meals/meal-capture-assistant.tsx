"use client";

import { Check, Package, Scale, Sparkles, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  _allowOffCompare: boolean,
  /** @deprecated kept for call-site compat */
  _hasOffMatch = false,
): AssistStepId[] {
  void entry;
  void _allowOffCompare;
  void _hasOffMatch;
  return ["identity", "portion", "confirm"];
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
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Schritt {index + 1} von {steps.length}
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Abbrechen
          </Button>
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
                      "mx-auto flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold",
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
                    "max-w-full truncate text-xs",
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
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          Zurück
        </Button>
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
  const dishUncertain = dish?.key === "low" || dish?.key === "medium";

  return (
    <div
      className={cn(
        "space-y-6 rounded-2xl border bg-background p-5 sm:p-6",
        dishUncertain
          ? "border-warning/50 bg-warning/10"
          : "border-border",
      )}
    >
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

      {dishUncertain ? (
        <p className="text-center text-sm font-medium text-warning-foreground">
          {isProduct
            ? "Produkt unsicher – Bezeichnung prüfen und bei Bedarf anpassen."
            : "Gericht unsicher – Name prüfen und bei Bedarf anpassen."}
        </p>
      ) : null}

      {onNameChange ? (
        <label className="block space-y-2 text-center">
          <span className="text-xs text-muted-foreground">Bezeichnung</span>
          <Input
            className="h-auto py-3 text-center font-display text-xl font-bold leading-snug tracking-tight sm:text-2xl"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            onFocus={(e) =>
              e.currentTarget.scrollIntoView({
                behavior: "smooth",
                block: "center",
              })
            }
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
        level === "high" && "bg-primary/15 text-foreground",
        level === "medium" && "bg-warning/15 text-warning-foreground",
        level === "low" && "bg-destructive/15 text-destructive",
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
