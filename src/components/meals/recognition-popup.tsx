"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  confidenceLevel,
  confidencePercent,
} from "@/lib/confidence";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  name: string;
  amountLabel?: string | null;
  subtitle?: string | null;
  portionConfidence?: number | null;
  confidence?: number | null;
  onContinue: () => void;
};

/** Menge und Gesamtgewicht getrennt; Einheit bleibt am Zahlenwert. */
function amountLines(label: string) {
  const withNbsp = label.replace(/(\d+(?:[.,]\d+)?)\s+(g|kg|ml|l)\b/gi, "$1\u00A0$2");
  const comma = withNbsp.match(/^(.+?),\s+(.+)$/);
  if (comma) return [comma[1], comma[2]];
  return [withNbsp];
}

export function RecognitionPopup({
  open,
  name,
  amountLabel,
  subtitle,
  portionConfidence,
  confidence,
  onContinue,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const lines = amountLabel ? amountLines(amountLabel) : [];
  const portion = confidenceLevel(portionConfidence);
  const dish =
    typeof confidence === "number" ? confidenceLevel(confidence) : null;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 p-6 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          role="dialog"
          aria-modal="true"
          aria-label="Erkanntes Gericht"
        >
          <motion.div
            className="w-full max-w-md text-center"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 280, damping: 22 }}
          >
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Erkannt
            </p>
            <h2 className="mt-4 font-display text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
              {name}
            </h2>
            {lines.length ? (
              <div className="mt-5 space-y-1 text-2xl font-bold text-primary sm:text-3xl">
                {lines.map((line) => (
                  <p key={line} className="whitespace-nowrap">
                    {line}
                  </p>
                ))}
              </div>
            ) : null}

            <div className="mx-auto mt-5 flex max-w-sm flex-col gap-2">
              <UncertaintyBadge
                label={`Portionsgrösse ${portion.label}`}
                detail={`${confidencePercent(portion.score)} % · ${portion.detail}`}
                level={portion.key}
              />
              {dish ? (
                <UncertaintyBadge
                  label={`Gericht ${dish.label}`}
                  detail={`${confidencePercent(dish.score)} %`}
                  level={dish.key}
                />
              ) : null}
            </div>

            {subtitle ? (
              <p className="mt-3 text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
            <Button
              type="button"
              size="lg"
              className="mt-10 w-full"
              onClick={onContinue}
            >
              Menge prüfen
            </Button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function UncertaintyBadge({
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
        level === "high" && "bg-emerald-500/15 text-emerald-900 dark:text-emerald-100",
        level === "medium" && "bg-amber-500/15 text-amber-900 dark:text-amber-100",
        level === "low" && "bg-orange-500/20 text-orange-950 dark:text-orange-100",
      )}
    >
      <p className="font-semibold">{label}</p>
      <p className="mt-0.5 opacity-90">{detail}</p>
    </div>
  );
}
