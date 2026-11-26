"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getOrCreateDay, HUNTER_ID } from "@/lib/day-service";
import { buildRounds } from "@/lib/timetable";
import { award, XP } from "@/lib/xp";

export type RoundResult = {
  ok: boolean;
  awarded: number;
  leveledUp: boolean;
  level: number;
  completed: boolean;
  focusRatio: number;
  sessionDone: boolean;
};

export async function startSession(blockId: string): Promise<void> {
  const day = await getOrCreateDay();
  const block = await prisma.block.findFirst({ where: { id: blockId, dayId: day.id } });
  if (!block) redirect("/focus");

  const existing = await prisma.slotSession.findFirst({
    where: { blockId: block.id, endedAt: null },
  });
  if (existing) redirect(`/focus/${existing.id}`);

  const plan = buildRounds(block.endMin - block.startMin, block.slotProfile);
  if (plan.length === 0) redirect("/focus");

  const session = await prisma.slotSession.create({
    data: {
      dayId: day.id,
      blockId: block.id,
      targetMin: block.endMin - block.startMin,
      rounds: {
        create: plan.map((r) => ({ index: r.index, kind: r.kind, plannedMs: r.plannedMs })),
      },
    },
  });

  refresh();
  redirect(`/focus/${session.id}`);
}

export async function beginRound(roundId: string): Promise<{ ok: boolean }> {
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: { session: true },
  });
  if (!round || round.status === "DONE") return { ok: false };
  if (round.startedAt) return { ok: true };

  await prisma.round.update({
    where: { id: roundId },
    data: { status: "RUNNING", startedAt: new Date() },
  });
  refresh();
  return { ok: true };
}

export async function finishRound(roundId: string, focusedMs: number): Promise<RoundResult> {
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: { session: true },
  });
  if (!round) {
    return {
      ok: false,
      awarded: 0,
      leveledUp: false,
      level: 1,
      completed: false,
      focusRatio: 0,
      sessionDone: false,
    };
  }

  const clamped = Math.max(0, Math.min(focusedMs, round.plannedMs));
  const ratio = round.plannedMs > 0 ? clamped / round.plannedMs : 0;
  const completed = round.kind === "focus" && ratio >= 0.8;

  const result = await prisma.$transaction(async (tx) => {
    await tx.round.update({
      where: { id: round.id },
      data: {
        endedAt: new Date(),
        focusedMs: clamped,
        status: completed ? "DONE" : "ABANDONED",
      },
    });

    const awarded = completed
      ? await award(tx, {
          hunterId: HUNTER_ID,
          amount: XP.roundDone,
          reason: "round.done",
          sourceId: round.id,
          dayId: round.session.dayId,
        })
      : { awarded: 0, leveledUp: false, level: 1, duplicated: false, freePoints: 0 };

    // recompute the session total from its rounds
    const rounds = await tx.round.findMany({ where: { sessionId: round.sessionId } });
    const focusMin = Math.round(
      rounds
        .filter((r) => r.kind === "focus")
        .reduce((sum, r) => sum + Math.min(r.focusedMs, r.plannedMs), 0) / 60_000,
    );

    await tx.slotSession.update({ where: { id: round.sessionId }, data: { focusMin } });

    const focusRounds = rounds.filter((r) => r.kind === "focus");
    const allDone = focusRounds.every((r) => r.status === "DONE" || r.status === "ABANDONED");

    let sessionDone = false;
    if (allDone && focusRounds.some((r) => r.status === "DONE")) {
      const doneCount = focusRounds.filter((r) => r.status === "DONE").length;
      if (doneCount === focusRounds.length) {
        sessionDone = true;
        const ended = await tx.slotSession.update({
          where: { id: round.sessionId },
          data: { endedAt: new Date() },
        });
        await tx.block.update({ where: { id: ended.blockId }, data: { doneAt: new Date() } });
        await award(tx, {
          hunterId: HUNTER_ID,
          amount: XP.sessionClear,
          reason: "session.done",
          sourceId: ended.id,
          dayId: round.session.dayId,
        });
      }
    }

    const totalFocus = await tx.slotSession.findUniqueOrThrow({
      where: { id: round.sessionId },
    });
    await tx.dayLog.update({
      where: { id: round.session.dayId },
      data: { focusMinutes: totalFocus.focusMin },
    });

    return {
      ok: true,
      awarded: awarded.awarded,
      leveledUp: awarded.leveledUp,
      level: awarded.level,
      completed,
      focusRatio: ratio,
      sessionDone,
    };
  });

  refresh();
  return result;
}

export async function logSwitch(sessionId: string): Promise<void> {
  await prisma.slotSession.update({
    where: { id: sessionId },
    data: { switches: { increment: 1 } },
  });
  refresh();
}

export async function endSession(sessionId: string): Promise<void> {
  await prisma.slotSession.update({
    where: { id: sessionId },
    data: { endedAt: new Date() },
  });
  refresh();
  redirect("/");
}
