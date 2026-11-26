"use server";

import { refresh } from "next/cache";
import { prisma } from "@/lib/db";
import { getOrCreateDay, HUNTER_ID } from "@/lib/day-service";
import { award } from "@/lib/xp";

export type ToggleResult = { ok: boolean; awarded: number; leveledUp: boolean; level: number };

export async function toggleHabit(slug: string): Promise<ToggleResult> {
  const day = await getOrCreateDay();
  const habit = await prisma.habitDef.findUnique({ where: { slug } });
  if (!habit) return { ok: false, awarded: 0, leveledUp: false, level: 1 };

  const existing = await prisma.habitLog.findUnique({
    where: { dayId_habitId: { dayId: day.id, habitId: habit.id } },
  });

  if (existing) {
    // undo: remove the log and reverse its ledger entry so the totals stay honest
    await prisma.$transaction(async (tx) => {
      await tx.habitLog.delete({ where: { id: existing.id } });
      const ledger = await tx.xpLedger.findUnique({
        where: { reason_sourceId: { reason: `habit.${slug}`, sourceId: day.id } },
      });
      if (ledger) {
        await tx.xpLedger.delete({ where: { id: ledger.id } });
        const hunter = await tx.hunter.findUniqueOrThrow({ where: { id: HUNTER_ID } });
        await tx.hunter.update({
          where: { id: HUNTER_ID },
          data: { totalXp: Math.max(0, hunter.totalXp - ledger.amount) },
        });
        await tx.dayLog.update({
          where: { id: day.id },
          data: { xpTotal: { decrement: ledger.amount } },
        });
      }
    });
    refresh();
    return { ok: true, awarded: 0, leveledUp: false, level: 1 };
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.habitLog.create({ data: { dayId: day.id, habitId: habit.id } });
    return award(tx, {
      hunterId: HUNTER_ID,
      amount: habit.xp,
      reason: `habit.${slug}`,
      sourceId: day.id,
      dayId: day.id,
    });
  });

  refresh();
  return {
    ok: true,
    awarded: result.awarded,
    leveledUp: result.leveledUp,
    level: result.level,
  };
}
