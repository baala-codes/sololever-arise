import "server-only";
import { prisma } from "@/lib/db";
import { dateKeyToDbDate, localDateKey } from "@/lib/day";
import { DAY_TEMPLATE } from "@/lib/timetable";

export const HUNTER_ID = "local";
export const WORK_TARGET_MIN = 660;

/** Get (or create + materialize the timetable for) today's day log. */
export async function getOrCreateDay(dateKey = localDateKey(), hunterId = HUNTER_ID) {
  const date = dateKeyToDbDate(dateKey);
  const existing = await prisma.dayLog.findUnique({
    where: { date },
    include: { blocks: { orderBy: { order: "asc" } } },
  });
  if (existing) return existing;

  return prisma.$transaction(async (tx) => {
    const day = await tx.dayLog.create({
      data: {
        hunterId,
        date,
        workTargetMin: WORK_TARGET_MIN,
        blocks: {
          create: DAY_TEMPLATE.map((b, i) => ({
            order: i,
            title: b.title,
            subtitle: b.subtitle ?? null,
            startMin: b.startMin,
            endMin: b.endMin,
            type: b.type,
            slotProfile: b.slotProfile,
            microTasks: b.microTasks ?? undefined,
          })),
        },
      },
      include: { blocks: { orderBy: { order: "asc" } } },
    });
    return day;
  });
}

export type DayWithBlocks = Awaited<ReturnType<typeof getOrCreateDay>>;

export async function getHunter() {
  const hunter = await prisma.hunter.findUnique({
    where: { id: HUNTER_ID },
    include: { stats: true },
  });
  if (hunter) return hunter;
  return prisma.hunter.create({
    data: {
      id: HUNTER_ID,
      stats: { create: ["STR", "INT", "AGI", "VIT", "PER"].map((key) => ({ key: key as never })) },
    },
    include: { stats: true },
  });
}
