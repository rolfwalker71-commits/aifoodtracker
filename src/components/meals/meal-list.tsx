"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, type PanInfo } from "framer-motion";
import { CopyPlus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatAppDateTime } from "@/lib/datetime";
import { parseStoredIngredients } from "@/lib/meal-ingredients";
import { MEAL_TYPE_LABELS } from "@/lib/nutrition";
import {
  clearPendingSymbol,
  readPendingSymbols,
  requestMealSymbol,
} from "@/lib/pending-symbols";
import { formatNumber } from "@/lib/utils";
import type { MealType } from "@/generated/prisma/client";

function ingredientPipeLine(ingredients: unknown): string | null {
  const items = parseStoredIngredients(ingredients);
  if (!items.length) return null;
  return items
    .map((item) =>
      item.portionSize?.trim()
        ? `${item.name} (${item.portionSize.trim()})`
        : item.name,
    )
    .join(" | ");
}

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
  isFavorite?: boolean;
};

const ACTION_WIDTH = 192;
const OPEN_X = -ACTION_WIDTH;

function ImagePlaceholder({
  pending,
  missingFile,
}: {
  pending: boolean;
  missingFile?: boolean;
}) {
  return (
    <div className="flex h-full items-center justify-center text-lg font-semibold tracking-widest text-muted-foreground">
      {pending ? (
        <span className="animate-pulse" aria-label="Bild wird erzeugt">
          …
        </span>
      ) : (
        <span className="text-xs font-normal tracking-normal">
          {missingFile ? "Bild fehlt" : "Manuell"}
        </span>
      )}
    </div>
  );
}

function MealThumb({
  src,
  mealId,
  pending,
}: {
  src: string;
  mealId: string;
  pending: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <ImagePlaceholder pending={false} missingFile />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className="h-full w-full max-w-none object-cover"
      onError={() => {
        setFailed(true);
        requestMealSymbol(mealId);
      }}
    />
  );
}

function SwipeMealCard({
  meal,
  open,
  deleting,
  duplicating,
  pendingSymbol,
  onOpen,
  onClose,
  onDelete,
  onDuplicate,
}: {
  meal: MealListItem;
  open: boolean;
  deleting: boolean;
  duplicating: boolean;
  pendingSymbol: boolean;
  onOpen: () => void;
  onClose: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const [coarsePointer, setCoarsePointer] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const sync = () => setCoarsePointer(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  function onDragEnd(_: unknown, info: PanInfo) {
    const shouldOpen = info.offset.x + info.velocity.x * 0.2 < -48;
    if (shouldOpen) onOpen();
    else onClose();
  }

  const ingredientsLine = ingredientPipeLine(meal.ingredients);
  const macrosLine = `${formatNumber(meal.calories)} kcal · P ${formatNumber(meal.protein, 0)}g · K ${formatNumber(meal.carbs, 0)}g · F ${formatNumber(meal.fat, 0)}g`;

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div
        className="absolute inset-y-0 right-0 z-0 hidden w-48 max-md:flex"
        aria-hidden={!open}
      >
        <Button
          type="button"
          variant="secondary"
          tabIndex={open ? 0 : -1}
          className="h-full w-16 flex-col gap-1 rounded-none px-0"
          aria-label="Nochmal speichern"
          disabled={duplicating}
          onClick={() => {
            onClose();
            onDuplicate();
          }}
        >
          <CopyPlus className="h-5 w-5" />
          <span className="text-xs font-medium">Nochmal</span>
        </Button>
        <Button
          asChild
          variant="default"
          className="h-full w-16 flex-col gap-1 rounded-none px-0"
        >
          <Link
            href={`/meals/${meal.id}`}
            tabIndex={open ? 0 : -1}
            aria-label="Bearbeiten"
            onClick={onClose}
          >
            <Pencil className="h-5 w-5" />
            <span className="text-xs font-medium">Ändern</span>
          </Link>
        </Button>
        <Button
          type="button"
          variant="destructive"
          tabIndex={open ? 0 : -1}
          className="h-full w-16 flex-col gap-1 rounded-none px-0"
          aria-label="Löschen"
          disabled={deleting}
          onClick={() => {
            onClose();
            onDelete();
          }}
        >
          <Trash2 className="h-5 w-5" />
          <span className="text-xs font-medium">Löschen</span>
        </Button>
      </div>

      <motion.div
        drag="x"
        dragDirectionLock
        dragListener={coarsePointer}
        dragConstraints={{ left: OPEN_X, right: 0 }}
        dragElastic={0.06}
        animate={{ x: open ? OPEN_X : 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 36 }}
        onDragEnd={onDragEnd}
        className="relative z-10 touch-pan-y rounded-2xl bg-background"
      >
        <div className="overflow-hidden rounded-2xl border border-border bg-background text-card-foreground shadow-sm">
          <div className="p-3">
            <div className="flex gap-3">
              <div className="min-w-0 flex-1 space-y-1.5">
                <Link
                  href={`/meals/${meal.id}`}
                  className="block rounded-md outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                  onClick={onClose}
                >
                  <h3 className="font-semibold leading-snug break-words hover:underline">
                    {meal.name}
                    {meal.isFavorite ? (
                      <span className="ml-1 text-primary" aria-label="Favorit">
                        ★
                      </span>
                    ) : null}
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
                {ingredientsLine ? (
                  <p
                    className="hidden text-sm text-muted-foreground md:block md:truncate"
                    title={ingredientsLine}
                  >
                    {ingredientsLine}
                  </p>
                ) : null}
                <p className="text-sm text-muted-foreground">{macrosLine}</p>
                <div className="hidden gap-1 pt-1 md:flex">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/meals/${meal.id}`} onClick={onClose}>
                      <Pencil className="h-4 w-4" />
                      Ändern
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={duplicating}
                    onClick={onDuplicate}
                  >
                    <CopyPlus className="h-4 w-4" />
                    Nochmal
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={deleting}
                    onClick={onDelete}
                  >
                    <Trash2 className="h-4 w-4" />
                    Löschen
                  </Button>
                </div>
              </div>

              <Link
                href={`/meals/${meal.id}`}
                className="relative h-24 w-24 shrink-0 self-start overflow-hidden rounded-xl bg-muted"
                aria-label={`${meal.name} anzeigen`}
                onClick={onClose}
              >
                {meal.imagePath ? (
                  <MealThumb
                    src={meal.imagePath}
                    mealId={meal.id}
                    pending={pendingSymbol}
                  />
                ) : (
                  <ImagePlaceholder pending={pendingSymbol} />
                )}
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function MealList({ meals }: { meals: MealListItem[] }) {
  const router = useRouter();
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<string[]>([]);

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

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

  async function duplicateMeal(id: string) {
    setDuplicatingId(id);
    try {
      const response = await fetch(`/api/meals/${id}/duplicate`, {
        method: "POST",
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Kopie fehlgeschlagen");
      }
      toast.success("Nochmal gespeichert");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Kopie fehlgeschlagen",
      );
    } finally {
      setDuplicatingId(null);
    }
  }

  if (!items.length) {
    return (
      <Card>
        <CardContent className="space-y-3 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            Noch keine Mahlzeiten erfasst.
          </p>
          <Button asChild>
            <Link href="/meals/new">Erfassen</Link>
          </Button>
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
          duplicating={duplicatingId === meal.id}
          pendingSymbol={!meal.imagePath && pendingIds.includes(meal.id)}
          onOpen={() => setOpenId(meal.id)}
          onClose={() =>
            setOpenId((current) => (current === meal.id ? null : current))
          }
          onDelete={() => setPendingDeleteId(meal.id)}
          onDuplicate={() => void duplicateMeal(meal.id)}
        />
      ))}
      <ConfirmDialog
        open={Boolean(pendingDeleteId)}
        title="Mahlzeit löschen?"
        description="Die Mahlzeit wird dauerhaft entfernt."
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
        onConfirm={() => {
          if (pendingDeleteId) void removeMeal(pendingDeleteId);
          setPendingDeleteId(null);
        }}
      />
    </div>
  );
}
