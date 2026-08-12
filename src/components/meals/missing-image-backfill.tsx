"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const SESSION_KEY = "nutrisight-symbol-backfill-done";

type BackfillResult = {
  checked?: number;
  needed?: number;
  done?: number;
  failed?: number;
  remaining?: number;
  error?: string;
};

/**
 * After deploys, upload files may be gone while DB paths remain.
 * Regenerates AI symbols for empty/broken images (batched).
 */
export function MissingImageBackfill() {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(SESSION_KEY) === "1") return;
    } catch {
      // continue
    }

    let cancelled = false;
    let toastId: string | number | undefined;
    let totalDone = 0;

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
            try {
              sessionStorage.setItem(SESSION_KEY, "1");
            } catch {
              // ignore
            }
            break;
          }

          if (!toastId && data.needed > 0) {
            toastId = toast.loading(
              `Erzeuge fehlende Bilder (${data.needed})…`,
            );
          }

          totalDone += data.done ?? 0;

          if ((data.done ?? 0) > 0) {
            router.refresh();
          }

          // Nothing more to do or stuck failing
          if ((data.done ?? 0) === 0 && (data.failed ?? 0) > 0) {
            break;
          }
          if ((data.needed ?? 0) <= (data.done ?? 0)) {
            // This batch cleared all found targets; check once more
            continue;
          }
        }

        if (toastId) {
          toast.dismiss(toastId);
        }

        if (totalDone > 0) {
          toast.success(
            totalDone === 1
              ? "1 fehlendes Bild neu erzeugt"
              : `${totalDone} fehlende Bilder neu erzeugt`,
          );
          router.refresh();
          try {
            sessionStorage.setItem(SESSION_KEY, "1");
          } catch {
            // ignore
          }
        } else {
          // Mark done only if a clean empty scan happened
          try {
            sessionStorage.setItem(SESSION_KEY, "1");
          } catch {
            // ignore
          }
        }
      } catch (error) {
        if (toastId) toast.dismiss(toastId);
        console.error(error);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
