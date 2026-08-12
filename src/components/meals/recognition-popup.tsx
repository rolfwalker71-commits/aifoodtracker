"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  name: string;
  amountLabel?: string | null;
  subtitle?: string | null;
  onContinue: () => void;
};

export function RecognitionPopup({
  open,
  name,
  amountLabel,
  subtitle,
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
            {amountLabel ? (
              <p className="mt-5 text-2xl font-bold text-primary sm:text-3xl">
                {amountLabel}
              </p>
            ) : null}
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
