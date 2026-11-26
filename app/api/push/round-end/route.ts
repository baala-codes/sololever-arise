import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { broadcast } from "@/lib/push";

/**
 * Fires a push for rounds whose planned time has elapsed while the tab was closed.
 * Protect it with CRON_SECRET and hit it from any 1-minute scheduler, e.g.
 *   curl -X POST https://<app>/api/push/round-end -H "Authorization: Bearer $CRON_SECRET"
 * Vercel's built-in cron can run this too, but Hobby only allows daily schedules.
 */
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 503 });
  }
  const header = req.headers.get("authorization");
  if (header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const rounds = await prisma.round.findMany({
    where: { status: "RUNNING", notifiedAt: null, startedAt: { not: null } },
    take: 10,
    include: {
      session: { include: { block: { select: { title: true } } } },
    },
  });

  let pinged = 0;
  for (const round of rounds) {
    const end = round.startedAt!.getTime() + round.plannedMs;
    // ignore rounds that ended more than an hour ago — stale pings are noise
    if (end > now || now - end > 3_600_000) continue;

    const res = await broadcast({
      title: "ROUND COMPLETE",
      body: `${round.session.block.title} · ${Math.round(round.plannedMs / 60000)}m round ended. Log it before you drift.`,
      url: `/focus/${round.sessionId}`,
      tag: `round-${round.id}`,
    });

    await prisma.round.update({
      where: { id: round.id },
      data: { notifiedAt: new Date() },
    });
    pinged += 1;
    if (!res.configured) break;
  }

  return NextResponse.json({ checked: rounds.length, pinged });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
