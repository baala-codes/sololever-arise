"use server";

import { refresh } from "next/cache";
import { prisma } from "@/lib/db";
import { broadcast, pushConfigured } from "@/lib/push";

export type PushResult = {
  ok: boolean;
  error?: string;
  sent?: number;
};

export type IncomingSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export async function savePushSubscription(
  sub: IncomingSubscription,
  userAgent = "",
): Promise<PushResult> {
  const endpoint = sub?.endpoint?.trim();
  const p256dh = sub?.p256dh?.trim();
  const auth = sub?.auth?.trim();
  if (!endpoint || !p256dh || !auth) return { ok: false, error: "Malformed subscription." };
  if (!endpoint.startsWith("https://")) return { ok: false, error: "Endpoint must be https." };

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, p256dh, auth, userAgent: userAgent.slice(0, 200) || null },
    update: { p256dh, auth },
  });

  refresh();
  return { ok: true };
}

export async function removePushSubscription(endpoint: string): Promise<PushResult> {
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  refresh();
  return { ok: true };
}

export async function sendTestPush(): Promise<PushResult> {
  if (!pushConfigured()) {
    return { ok: false, error: "VAPID keys are not set on this deployment." };
  }
  const res = await broadcast({
    title: "SYSTEM",
    body: "Alerts are linked. A round ending will reach you with the tab closed.",
    url: "/",
    tag: "arise-test",
  });
  if (res.sent === 0) {
    return { ok: false, error: "No linked device accepted the push. Re-enable alerts." };
  }
  return { ok: true, sent: res.sent };
}
