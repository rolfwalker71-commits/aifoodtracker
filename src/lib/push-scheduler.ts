import { runtimeEnv } from "@/lib/runtime-env";

let started = false;

export function startPushScheduler() {
  if (started) return;
  if (!runtimeEnv("VAPID_PUBLIC_KEY") || !runtimeEnv("VAPID_PRIVATE_KEY")) return;
  started = true;

  const tick = async () => {
    try {
      const { dispatchDuePushes } = await import("@/lib/push-dispatch");
      await dispatchDuePushes();
    } catch (error) {
      console.error("Push scheduler tick failed:", error);
    }
  };

  const delay = 60_000 - (Date.now() % 60_000) + 1500;
  setTimeout(() => {
    void tick();
    setInterval(() => void tick(), 60_000);
  }, delay);
}
