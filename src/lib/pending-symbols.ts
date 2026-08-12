const STORAGE_KEY = "nutrisight-pending-symbols";

export function rememberPendingSymbol(mealId: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const ids = raw ? (JSON.parse(raw) as string[]) : [];
    if (!ids.includes(mealId)) {
      ids.push(mealId);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    }
  } catch {
    // ignore storage errors
  }
}

export function readPendingSymbols(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function clearPendingSymbol(mealId: string) {
  if (typeof window === "undefined") return;
  try {
    const ids = readPendingSymbols().filter((id) => id !== mealId);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

/** Fire-and-forget symbol generation; survives short navigations via keepalive. */
export function requestMealSymbol(mealId: string) {
  rememberPendingSymbol(mealId);
  try {
    void fetch(`/api/meals/${mealId}/symbol`, {
      method: "POST",
      cache: "no-store",
      keepalive: true,
    });
  } catch {
    // ignore
  }
}
