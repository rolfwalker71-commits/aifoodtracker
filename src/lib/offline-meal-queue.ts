import type { MealFormValues } from "@/types/meals";

const STORAGE_KEY = "nutrisight-offline-meals-v1";

export type QueuedMeal = {
  id: string;
  createdAt: string;
  payload: MealFormValues;
};

function readRaw(): QueuedMeal[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedMeal[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRaw(items: QueuedMeal[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("nutrisight:offline-queue"));
}

export function getOfflineMealQueue(): QueuedMeal[] {
  return readRaw();
}

export function getOfflineMealQueueCount(): number {
  return readRaw().length;
}

export function enqueueOfflineMeal(payload: MealFormValues): QueuedMeal {
  const item: QueuedMeal = {
    id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    payload,
  };
  writeRaw([...readRaw(), item]);
  return item;
}

export function removeOfflineMeal(id: string) {
  writeRaw(readRaw().filter((item) => item.id !== id));
}

export async function flushOfflineMealQueue(): Promise<{
  synced: number;
  failed: number;
}> {
  const items = readRaw();
  if (!items.length) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;
  const remaining: QueuedMeal[] = [];

  for (const item of items) {
    try {
      const response = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          ...item.payload,
          consumedAt: new Date(item.payload.consumedAt).toISOString(),
        }),
      });
      if (!response.ok) {
        remaining.push(item);
        failed += 1;
        continue;
      }
      synced += 1;
    } catch {
      remaining.push(item);
      failed += 1;
    }
  }

  writeRaw(remaining);
  return { synced, failed };
}
