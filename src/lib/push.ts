import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import {
  absoluteAssetUrl,
  type PushPayload,
} from "@/lib/push-motifs";

let configured = false;

export function vapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY?.trim() || "";
}

function configureWebPush() {
  const publicKey = vapidPublicKey();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() || "";
  const subject =
    process.env.VAPID_SUBJECT?.trim() || "mailto:hello@example.com";
  if (!publicKey || !privateKey) return false;
  if (!configured) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  }
  return true;
}

export function pushConfigured() {
  return Boolean(vapidPublicKey() && process.env.VAPID_PRIVATE_KEY?.trim());
}

function withAbsoluteAssets(payload: PushPayload): PushPayload {
  return {
    ...payload,
    icon: absoluteAssetUrl(payload.icon),
    badge: absoluteAssetUrl(payload.badge),
    image: absoluteAssetUrl(payload.image),
  };
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!configureWebPush()) return { sent: 0, gone: 0 };

  const subs = await prisma.pushSubscription.findMany({
    where: { userId },
  });
  if (!subs.length) return { sent: 0, gone: 0 };

  const body = JSON.stringify(withAbsoluteAssets(payload));
  let sent = 0;
  let gone = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
          { TTL: 60 * 60 * 4, urgency: "normal" },
        );
        sent += 1;
      } catch (error) {
        const status =
          error && typeof error === "object" && "statusCode" in error
            ? Number((error as { statusCode?: number }).statusCode)
            : 0;
        if (status === 404 || status === 410) {
          gone += 1;
          await prisma.pushSubscription
            .delete({ where: { id: sub.id } })
            .catch(() => undefined);
        } else {
          console.error("Web push failed:", error);
        }
      }
    }),
  );

  return { sent, gone };
}

export async function claimDelivery(
  userId: string,
  kind: string,
  dayKey: string,
) {
  try {
    await prisma.pushDelivery.create({
      data: { userId, kind, dayKey },
    });
    return true;
  } catch {
    return false;
  }
}
