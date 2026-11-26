import "server-only";
import webpush from "web-push";
import { prisma } from "@/lib/db";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

function configure(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:hunter@example.com",
    publicKey,
    privateKey,
  );
  return true;
}

export function pushConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

/** Send one payload to every stored device. Dead endpoints are pruned. */
export async function broadcast(
  payload: PushPayload,
): Promise<{ sent: number; pruned: number; configured: boolean }> {
  if (!configure()) return { sent: 0, pruned: 0, configured: false };

  const subs = await prisma.pushSubscription.findMany();
  let sent = 0;
  let pruned = 0;

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
        { TTL: 600 },
      );
      sent += 1;
      await prisma.pushSubscription.update({
        where: { id: sub.id },
        data: { lastSentAt: new Date() },
      });
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        pruned += 1;
      }
    }
  }

  return { sent, pruned, configured: true };
}
