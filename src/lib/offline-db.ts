import type { MealFormValues } from "@/types/meals";

const DB_NAME = "nutrisight-offline";
const DB_VERSION = 2;
const LEGACY_KEY = "nutrisight-offline-meals-v1";

export type OfflineDraftKind = "photo" | "text" | "barcode" | "manual";

export type OfflineDraft = {
  id: string;
  createdAt: string;
  kind: OfflineDraftKind;
  label: string;
  text?: string;
  barcode?: string;
  imageBlob?: Blob;
  imageName?: string;
  imageMime?: string;
  formDraft?: MealFormValues;
};

export type DaySnapshotMeal = {
  id: string;
  name: string;
  mealType: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  portionSize?: string | null;
  consumedAt: string;
  imagePath?: string | null;
};

export type DaySnapshot = {
  savedAt: string;
  dateLabel: string;
  dayKey: string;
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  goals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  meals: DaySnapshotMeal[];
  weightKg: number | null;
};

type MetaRow = { key: string; value: unknown };

function notify() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("nutrisight:offline-queue"));
  window.dispatchEvent(new CustomEvent("nutrisight:offline-snapshot"));
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("drafts")) {
        db.createObjectStore("drafts", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta", { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txDone(tx: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function migrateLegacyLocalStorage() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Array<{
      id: string;
      createdAt: string;
      payload: MealFormValues;
    }>;
    if (!Array.isArray(parsed) || !parsed.length) {
      localStorage.removeItem(LEGACY_KEY);
      return;
    }
    for (const item of parsed) {
      await putDraft({
        id: item.id,
        createdAt: item.createdAt,
        kind: "manual",
        label: item.payload?.name || "Offline-Mahlzeit",
        formDraft: item.payload,
      });
    }
    localStorage.removeItem(LEGACY_KEY);
    notify();
  } catch {
    // ignore broken legacy data
  }
}

let migrated = false;

async function ensureReady() {
  if (typeof window === "undefined") return;
  if (!migrated) {
    migrated = true;
    await migrateLegacyLocalStorage();
  }
}

export async function listOfflineDrafts(): Promise<OfflineDraft[]> {
  await ensureReady();
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("drafts", "readonly");
    const req = tx.objectStore("drafts").getAll();
    req.onsuccess = () => {
      const rows = (req.result || []) as OfflineDraft[];
      rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      resolve(rows);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getOfflineDraftCount(): Promise<number> {
  const drafts = await listOfflineDrafts();
  return drafts.length;
}

export async function getOfflineDraft(
  id: string,
): Promise<OfflineDraft | null> {
  await ensureReady();
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("drafts", "readonly");
    const req = tx.objectStore("drafts").get(id);
    req.onsuccess = () => resolve((req.result as OfflineDraft) || null);
    req.onerror = () => reject(req.error);
  });
}

async function putDraft(draft: OfflineDraft) {
  const db = await openDb();
  const tx = db.transaction("drafts", "readwrite");
  tx.objectStore("drafts").put(draft);
  await txDone(tx);
  notify();
}

export async function enqueueOfflineDraft(
  input: Omit<OfflineDraft, "id" | "createdAt"> & {
    id?: string;
    createdAt?: string;
  },
): Promise<OfflineDraft> {
  await ensureReady();
  const draft: OfflineDraft = {
    ...input,
    id:
      input.id ||
      `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: input.createdAt || new Date().toISOString(),
  };
  await putDraft(draft);
  return draft;
}

export async function removeOfflineDraft(id: string) {
  await ensureReady();
  const db = await openDb();
  const tx = db.transaction("drafts", "readwrite");
  tx.objectStore("drafts").delete(id);
  await txDone(tx);
  notify();
}

export async function saveDaySnapshot(snapshot: DaySnapshot) {
  await ensureReady();
  const db = await openDb();
  const tx = db.transaction("meta", "readwrite");
  const row: MetaRow = { key: "day-snapshot", value: snapshot };
  tx.objectStore("meta").put(row);
  await txDone(tx);
  notify();
}

export async function getDaySnapshot(): Promise<DaySnapshot | null> {
  await ensureReady();
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("meta", "readonly");
    const req = tx.objectStore("meta").get("day-snapshot");
    req.onsuccess = () => {
      const row = req.result as MetaRow | undefined;
      resolve((row?.value as DaySnapshot) || null);
    };
    req.onerror = () => reject(req.error);
  });
}

/** @deprecated use enqueueOfflineDraft – kept for call-site compatibility */
export async function enqueueOfflineMeal(payload: MealFormValues) {
  return enqueueOfflineDraft({
    kind: "manual",
    label: payload.name || "Offline-Mahlzeit",
    formDraft: payload,
  });
}

export function getOfflineMealQueueCount(): number {
  return 0;
}

export async function getOfflineMealQueue(): Promise<OfflineDraft[]> {
  return listOfflineDrafts();
}

export function removeOfflineMeal(id: string) {
  return removeOfflineDraft(id);
}
