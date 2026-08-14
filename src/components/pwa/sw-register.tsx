"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    async function register() {
      try {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith("nutrisight-") &&
                key !== "nutrisight-shell-v7" &&
                key !== "nutrisight-static-v7" &&
                key !== "nutrisight-runtime-v7",
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
