"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const SESSION_KEY = "nutrisight-symbol-backfill-done-v2";

type BackfillResult = {
  checked?: number;
  needed?: number;
  done?: number;
  failed?: number;
  remaining?: number;
  lastError?: string | null;
  error?: string;
};

/**
 * After deploys, upload files may be gone while DB paths remain.
 * Regenerates AI symbols for empty/broken images (batched).
 */
export function MissingImageBackfill({
  force = false,
}: {
  force?: boolean;
} = {}) {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (typeof window === "undefined") return;
    try {
      if (!force && sessionStorage.getItem(SESSION_KEY) === "1") return;
    } catch {
      // continue
    }

    let cancelled = false;
    let toastId: string | number | undefined;
    let totalDone = 0;
    let totalFailed = 0;
    let lastError: string | null = null;

    async function runBatch(): Promise<BackfillResult | null> {
      const response = await fetch("/api/meals/symbols/backfill", {
        method: "POST",
        cache: "no-store",
      });
      const data = (await response.json().catch(() => ({}))) as BackfillResult;
      if (!response.ok) {
        throw new Error(data.error || "Backfill fehlgeschlagen");
      }
      return data;
    }

    async function run() {
      try {
        let safety = 0;
        while (!cancelled && safety < 40) {
          safety += 1;
          const data = await runBatch();
          if (!data) break;

          if (!data.needed) {
            if (totalDone === 0 && totalFailed === 0) {
              try {
                sessionStorage.setItem(SESSION_KEY, "1");
              } catch {
                // ignore
              }
            }
            break;
          }

          if (!toastId) {
            toastId = toast.loading(
              `Erzeuge fehlende Bilder (${data.needed})…`,
            );
          }

          totalDone += data.done ?? 0;
          totalFailed += data.failed ?? 0;
          if (data.lastError) lastError = data.lastError;

          if ((data.done ?? 0) > 0) {
            router.refresh();
          }

          if ((data.done ?? 0) === 0 && (data.failed ?? 0) > 0) {
            break;
          }
        }

        if (toastId) toast.dismiss(toastId);

        if (totalDone > 0) {
          toast.success(
            totalDone === 1
              ? "1 fehlendes Bild neu erzeugt"
              : `${totalDone} fehlende Bilder neu erzeugt`,
          );
          router.refresh();
          if (totalFailed === 0) {
            try {
              sessionStorage.setItem(SESSION_KEY, "1");
            } catch {
              // ignore
            }
          }
        } else if (totalFailed > 0) {
          toast.error(
            lastError
              ? `Bilder fehlgeschlagen: ${lastError}`
              : "Fehlende Bilder konnten nicht erzeugt werden (API-Key / Schreibrechte prüfen)",
          );
        }
      } catch (error) {
        if (toastId) toast.dismiss(toastId);
        toast.error(
          error instanceof Error
            ? error.message
            : "Bilder-Backfill fehlgeschlagen",
        );
        console.error(error);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [force, router]);

  return null;
}

/** Clear session flag and trigger another backfill pass. */
export function triggerMissingImageBackfill() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
  window.location.reload();
}
