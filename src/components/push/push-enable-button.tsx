"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export function PushEnableButton() {
  const [status, setStatus] = useState<
    "loading" | "unavailable" | "off" | "on"
  >("loading");

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setStatus("unavailable");
      return;
    }
    try {
      const meta = await fetch("/api/push/subscribe", { cache: "no-store" });
      const data = await meta.json();
      if (!data.configured) {
        setStatus("unavailable");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      setStatus(sub || data.subscribed ? "on" : "off");
    } catch {
      setStatus("off");
    }
  }

  async function enable() {
    try {
      const vapid = await fetch("/api/push/vapid", { cache: "no-store" }).then(
        (r) => r.json(),
      );
      if (!vapid.configured || !vapid.publicKey) {
        toast.error("Web Push ist auf dem Server nicht eingerichtet");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Benachrichtigungen abgelehnt");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapid.publicKey),
        }));
      const json = subscription.toJSON();
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
        }),
      });
      if (!response.ok) {
        throw new Error("Speichern fehlgeschlagen");
      }
      setStatus("on");
      toast.success("Push aktiv – Erinnerungen kommen auch bei geschlossener App");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Push konnte nicht aktiviert werden",
      );
    }
  }

  async function disable() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      } else {
        await fetch("/api/push/subscribe", { method: "DELETE" });
      }
      setStatus("off");
      toast.success("Push deaktiviert");
    } catch {
      toast.error("Konnte Push nicht deaktivieren");
    }
  }

  if (status === "loading") return null;
  if (status === "unavailable") {
    return (
      <p className="text-sm text-muted-foreground">
        Web Push braucht eine installierte PWA (Homescreen) und HTTPS. Auf
        diesem Gerät aktuell nicht verfügbar.
      </p>
    );
  }

  return (
    <Button
      type="button"
      variant={status === "on" ? "secondary" : "default"}
      onClick={() => void (status === "on" ? disable() : enable())}
    >
      {status === "on" ? (
        <>
          <Bell className="h-4 w-4" />
          Push aktiv
        </>
      ) : (
        <>
          <BellOff className="h-4 w-4" />
          Push aktivieren
        </>
      )}
    </Button>
  );
}
