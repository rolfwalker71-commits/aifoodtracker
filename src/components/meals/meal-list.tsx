"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, type PanInfo } from "framer-motion";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { formatAppDateTime } from "@/lib/datetime";
import { MEAL_TYPE_LABELS } from "@/lib/nutrition";
import {
  clearPendingSymbol,
  readPendingSymbols,
  requestMealSymbol,
} from "@/lib/pending-symbols";
import { formatNumber } from "@/lib/utils";
import type { MealType } from "@/generated/prisma/client";

export type MealListItem = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealType: MealType;
  consumedAt: string;
  imagePath?: string | null;
  portionSize?: string | null;
  ingredients?: unknown;
};

const ACTION_WIDTH = 148;
const OPEN_X = -ACTION_WIDTH;

function MealThumb({ src, alt }: { src: string; alt: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className="h-full w-full object-cover" />
  );
}

function ImagePlaceholder({ pending }: { pending: boolean }) {
  return (
    <div className="flex h-full items-center justify-center text-lg font-semibold tracking-widest text-muted-foreground">
      {pending ? (
        <span className="animate-pulse" aria-label="Bild wird erzeugt">
          …
        </span>
      ) : (
        <span className="text-xs font-normal tracking-normal">Manuell</span>
      )}
    </div>
  );
}

function SwipeMealCard({
  meal,
  open,
  deleting,
  pendingSymbol,
  onOpen,
  onClose,
  onDelete,
}: {
  meal: MealListItem;
  open: boolean;
  deleting: boolean;
  pendingSymbol: boolean;
  onOpen: () => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  function onDragEnd(_: unknown, info: PanInfo) {
    const shouldOpen = info.offset.x + info.velocity.x * 0.2 < -48;
    if (shouldOpen) onOpen();
    else onClose();
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="absolute inset-y-0 right-0 flex w-[148px]">
        <Link
          href={`/meals/${meal.id}`}
          className="flex w-[74px] flex-col items-center justify-center gap-1 bg-emerald-600 text-white"
          aria-label="Bearbeiten"
          onClick={onClose}
        >
          <Pencil className="h-5 w-5" />
          <span className="text-[11px] font-medium">Ändern</span>
        </Link>
        <button
          type="button"
          className="flex w-[74px] flex-col items-center justify-center gap-1 bg-red-600 text-white disabled:opacity-60"
          aria-label="Löschen"
          disabled={deleting}
          onClick={() => {
            onClose();
            onDelete();
          }}
        >
          <Trash2 className="h-5 w-5" />
          <span className="text-[11px] font-medium">Löschen</span>
        </button>
      </div>

      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: OPEN_X, right: 0 }}
        dragElastic={0.06}
        animate={{ x: open ? OPEN_X : 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 36 }}
        onDragEnd={onDragEnd}
        className="relative z-10 touch-pan-y"
      >
        <Card className="overflow-hidden rounded-2xl border bg-card shadow-none">
          <CardContent className="p-3">
            <div className="flex gap-3">
              <div className="min-w-0 flex-1 space-y-1.5">
                <Link
                  href={`/meals/${meal.id}`}
                  className="block rounded-md outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                  onClick={onClose}
                >
                  <h3 className="font-semibold leading-snug break-words hover:underline">
                    {meal.name}
                  </h3>
                </Link>
                <p className="text-sm leading-snug">
                  <span className="font-bold">
                    {MEAL_TYPE_LABELS[meal.mealType]}
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {formatAppDateTime(meal.consumedAt)}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {meal.portionSize?.trim() || "Menge unbekannt"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatNumber(meal.calories)} kcal · P{" "}
                  {formatNumber(meal.protein, 0)}g · K{" "}
                  {formatNumber(meal.carbs, 0)}g · F{" "}
                  {formatNumber(meal.fat, 0)}g
                </p>
              </div>

              <Link
                href={`/meals/${meal.id}`}
                className="relative h-24 w-24 shrink-0 self-start overflow-hidden rounded-xl bg-muted"
                aria-label={`${meal.name} anzeigen`}
                onClick={onClose}
              >
                {meal.imagePath ? (
                  <MealThumb src={meal.imagePath} alt={meal.name} />
                ) : (
                  <ImagePlaceholder pending={pendingSymbol} />
                )}
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export function MealList({ meals }: { meals: MealListItem[] }) {
  const router = useRouter();
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<string[]>([]);

  const items = useMemo(
    () => meals.filter((meal) => !removedIds.includes(meal.id)),
    [meals, removedIds],
  );

  useEffect(() => {
    const pending = readPendingSymbols();
    for (const meal of meals) {
      if (meal.imagePath && pending.includes(meal.id)) {
        clearPendingSymbol(meal.id);
      }
    }
    setPendingIds(readPendingSymbols());
  }, [meals]);

  useEffect(() => {
    const waiting = items.filter(
      (meal) => !meal.imagePath && pendingIds.includes(meal.id),
    );
    if (!waiting.length) return;

    for (const meal of waiting) {
      requestMealSymbol(meal.id);
    }

    const timer = window.setInterval(() => {
      router.refresh();
    }, 2500);

    const stop = window.setTimeout(() => {
      window.clearInterval(timer);
      for (const meal of waiting) {
        clearPendingSymbol(meal.id);
      }
      setPendingIds(readPendingSymbols());
    }, 90000);

    return () => {
      window.clearInterval(timer);
      window.clearTimeout(stop);
    };
  }, [items, pendingIds, router]);

  async function removeMeal(id: string) {
    const confirmed = window.confirm("Mahlzeit wirklich löschen?");
    if (!confirmed) return;

    setDeletingId(id);
    setRemovedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));

    try {
      const response = await fetch(`/api/meals/${id}`, {
        method: "DELETE",
        cache: "no-store",
      });
      if (response.ok || response.status === 404) {
        clearPendingSymbol(id);
        toast.success("Mahlzeit gelöscht");
        router.refresh();
        return;
      }
      setRemovedIds((prev) => prev.filter((value) => value !== id));
      toast.error("Löschen fehlgeschlagen");
    } catch {
      setRemovedIds((prev) => prev.filter((value) => value !== id));
      toast.error("Löschen fehlgeschlagen");
    } finally {
      setDeletingId(null);
    }
  }

  if (!items.length) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Noch keine Mahlzeiten erfasst. Tippe auf Erfassen, um zu starten.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((meal) => (
        <SwipeMealCard
          key={meal.id}
          meal={meal}
          open={openId === meal.id}
          deleting={deletingId === meal.id}
          pendingSymbol={!meal.imagePath && pendingIds.includes(meal.id)}
          onOpen={() => setOpenId(meal.id)}
          onClose={() =>
            setOpenId((current) => (current === meal.id ? null : current))
          }
          onDelete={() => void removeMeal(meal.id)}
        />
      ))}
    </div>
  );
}
