import "server-only";
import webpush from "web-push";
import { db } from "@/lib/db";
import { isAllowedPushEndpoint } from "@/lib/domain/reminders";

// Sends phone/browser notifications (Web Push). The message is encrypted for the device, so the
// browser's push service (Google, Apple, Mozilla or Microsoft) passes it on without reading it.

export interface PushMessage {
  title: string;
  body: string;
  url: string; // where tapping the notification opens, always a path on this site
  tag?: string; // a newer notification with the same tag replaces the older one
}

let configured = false;
export function pushConfigured(): boolean {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const priv = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!pub || !priv) return false;
  if (!configured) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT?.trim() || "mailto:ascend.habittracker@gmail.com", pub, priv);
    configured = true;
  }
  return true;
}

type Sub = { id: string; endpoint: string; p256dh: string; auth: string };

/** Sends to one device. A device that has gone away (uninstalled, permission removed) is deleted. */
async function sendTo(sub: Sub, msg: PushMessage): Promise<boolean> {
  if (!isAllowedPushEndpoint(sub.endpoint)) {
    await db.pushSubscription.deleteMany({ where: { id: sub.id } });
    return false;
  }
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(msg), {
      TTL: 60 * 60, // a reminder an hour late is no use
      urgency: "normal",
      timeout: 10_000,
    });
    await db.pushSubscription.update({ where: { id: sub.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
    return true;
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) await db.pushSubscription.deleteMany({ where: { id: sub.id } });
    else console.error("push failed", status ?? e);
    return false;
  }
}

/** Sends to every device the user turned notifications on for. Returns how many received it. */
export async function pushToUser(userId: string, msg: PushMessage): Promise<number> {
  if (!pushConfigured()) return 0;
  const subs = await db.pushSubscription.findMany({ where: { userId }, select: { id: true, endpoint: true, p256dh: true, auth: true } });
  const results = await Promise.all(subs.map((s) => sendTo(s, msg)));
  return results.filter(Boolean).length;
}
