"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { isAllowedPushEndpoint } from "@/lib/domain/reminders";
import { pushConfigured, pushToUser } from "@/lib/push";
import { allow } from "@/lib/rate-limit";
import { requireUser } from "@/lib/session";

export type PushResult = { ok: true } | { ok: false; error: string };

const MAX_DEVICES = 10;
const base64url = z.string().regex(/^[A-Za-z0-9_-]+={0,2}$/);

const subscription = z.object({
  endpoint: z.string().max(1000).refine(isAllowedPushEndpoint, "That browser's notification service isn't supported."),
  keys: z.object({ p256dh: base64url.min(80).max(120), auth: base64url.min(16).max(32) }),
  device: z.string().max(60).optional(),
});

/** Saves this device's subscription so reminders can reach it. */
export async function savePushSubscription(raw: unknown): Promise<PushResult> {
  const user = await requireUser();
  if (!pushConfigured()) return { ok: false, error: "Notifications aren't set up on this server yet." };
  if (!(await allow(`push-save:${user.id}`, 20, 60 * 60))) return { ok: false, error: "Too many tries. Wait a while and try again." };
  const parsed = subscription.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "That subscription isn't valid." };
  const { endpoint, keys, device } = parsed.data;

  const existing = await db.pushSubscription.findUnique({ where: { endpoint }, select: { userId: true } });
  if (!existing) {
    const count = await db.pushSubscription.count({ where: { userId: user.id } });
    if (count >= MAX_DEVICES) return { ok: false, error: `Notifications are on for ${MAX_DEVICES} devices already. Turn one off first.` };
  }
  // A browser's address belongs to whoever signed in on it last.
  await db.pushSubscription.upsert({
    where: { endpoint },
    update: { userId: user.id, p256dh: keys.p256dh, auth: keys.auth, device: device ?? null },
    create: { userId: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth, device: device ?? null },
  });
  revalidatePath("/settings");
  return { ok: true };
}

/** Forgets this device. */
export async function removePushSubscription(endpoint: string): Promise<PushResult> {
  const user = await requireUser();
  await db.pushSubscription.deleteMany({ where: { userId: user.id, endpoint: String(endpoint).slice(0, 1000) } });
  revalidatePath("/settings");
  return { ok: true };
}

/** Forgets every device, for "turn off everywhere". */
export async function removeAllPushSubscriptions(): Promise<PushResult> {
  const user = await requireUser();
  await db.pushSubscription.deleteMany({ where: { userId: user.id } });
  revalidatePath("/settings");
  return { ok: true };
}

/** Sends a sample notification to the user's devices. */
export async function sendTestPush(): Promise<PushResult> {
  const user = await requireUser();
  if (!(await allow(`push-test:${user.id}`, 5, 10 * 60))) return { ok: false, error: "Too many tests. Wait a few minutes." };
  const sent = await pushToUser(user.id, {
    title: "Ascend",
    body: "Notifications work. You'll get a reminder at each habit's reminder time.",
    url: "/today",
    tag: "test",
  });
  return sent > 0 ? { ok: true } : { ok: false, error: "It didn't reach any device. Turn notifications off and on again." };
}
