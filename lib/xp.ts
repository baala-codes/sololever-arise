import type { Prisma, StatKey } from "@/lib/generated/prisma/client";

export const XP = {
  roundDone: 25,
  sessionClear: 100,
  checkin: 50,
  checkinEarly: 25,
  lateCheckin: 25,
  shutdown: 60,
  habit: 0, // per-habit XP comes from HabitDef.xp
  problem: { EASY: 30, MEDIUM: 60, HARD: 120 },
} as const;

export function xpToNext(level: number): number {
  return Math.round(200 * Math.pow(Math.max(1, level), 1.35));
}

export function levelFromXp(totalXp: number): { level: number; into: number; needed: number } {
  let level = 1;
  let acc = 0;
  while (acc + xpToNext(level) <= totalXp) {
    acc += xpToNext(level);
    level += 1;
  }
  return { level, into: totalXp - acc, needed: xpToNext(level) };
}

export function rankOf(level: number): string {
  if (level >= 100) return "NATIONAL";
  if (level >= 70) return "S";
  if (level >= 50) return "A";
  if (level >= 35) return "B";
  if (level >= 20) return "C";
  if (level >= 10) return "D";
  return "E";
}

export function streakMultiplier(streak: number): number {
  return Math.min(2, 1 + 0.02 * streak);
}

export function statValue(xp: number, allocated: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 40)) + allocated;
}

const REASON_STAT: Record<string, StatKey | undefined> = {
  "checkin.done": "PER",
  "checkin.late": "PER",
  "shutdown.done": "PER",
  "round.done": "INT",
  "session.done": "INT",
  "habit.sleep": "VIT",
  "habit.oats": "VIT",
  "habit.eggs-am": "VIT",
  "habit.eggs-pm": "VIT",
  "habit.hair-oil": "PER",
  "habit.tea": "PER",
  "habit.shutdown": "PER",
  "dsa.easy": "INT",
  "dsa.medium": "INT",
  "dsa.hard": "INT",
};

export type AwardResult = {
  awarded: number;
  duplicated: boolean;
  leveledUp: boolean;
  level: number;
  freePoints: number;
};

type AwardInput = {
  hunterId: string;
  amount: number;
  reason: string;
  sourceId?: string;
  dayId?: string | null;
  stat?: StatKey;
  /** skip the streak multiplier (penalties, corrections) */
  raw?: boolean;
};

/**
 * Append to the XP ledger and update the cached hunter totals.
 * Idempotent on (reason, sourceId): a double-submitted form can't double-pay.
 */
export async function award(
  tx: Prisma.TransactionClient,
  { hunterId, amount, reason, sourceId = "", dayId = null, stat, raw = false }: AwardInput,
): Promise<AwardResult> {
  const hunter = await tx.hunter.findUniqueOrThrow({ where: { id: hunterId } });
  const before = levelFromXp(hunter.totalXp);
  const multiplier = raw || amount <= 0 ? 1 : streakMultiplier(hunter.streak);
  const final = Math.round(amount * multiplier);

  try {
    await tx.xpLedger.create({
      data: {
        dayId,
        amount: final,
        reason,
        sourceId,
        stat: stat ?? REASON_STAT[reason] ?? null,
      },
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return {
        awarded: 0,
        duplicated: true,
        leveledUp: false,
        level: before.level,
        freePoints: hunter.freePoints,
      };
    }
    throw err;
  }

  const nextTotal = hunter.totalXp + final;
  const after = levelFromXp(nextTotal);
  const gainedLevels = Math.max(0, after.level - before.level);

  const updated = await tx.hunter.update({
    where: { id: hunterId },
    data: {
      totalXp: nextTotal,
      level: after.level,
      freePoints: { increment: gainedLevels * 3 },
    },
  });

  if (dayId) {
    await tx.dayLog.update({ where: { id: dayId }, data: { xpTotal: { increment: final } } });
  }

  const statKey = stat ?? REASON_STAT[reason];
  if (statKey && final > 0) {
    await tx.statPoint.upsert({
      where: { hunterId_key: { hunterId, key: statKey } },
      create: { hunterId, key: statKey, xp: final },
      update: { xp: { increment: final } },
    });
  }

  return {
    awarded: final,
    duplicated: false,
    leveledUp: gainedLevels > 0,
    level: updated.level,
    freePoints: updated.freePoints,
  };
}

export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "P2002"
  );
}
