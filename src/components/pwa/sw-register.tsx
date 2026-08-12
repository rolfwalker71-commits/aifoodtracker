"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    async function register() {
      try {
        // Drop outdated caches that previously stored dashboard/meal HTML
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith("nutrisight-shell") ||
                key === "nutrisight-static-v1" ||
                key === "nutrisight-static-v2" ||
                key === "nutrisight-static-v3",
            )
            .map((key) => caches.delete(key)),
        );

        const registration = await navigator.serviceWorker.register("/sw.js");
        await registration.update();
      } catch {
        // Silent fail in unsupported environments
      }
    }

    register();
  }, []);

  return null;
}
