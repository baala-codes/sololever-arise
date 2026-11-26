"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { localMinutes } from "@/lib/day";
import { getOrCreateDay, HUNTER_ID } from "@/lib/day-service";
import { award, XP } from "@/lib/xp";

const MorningSchema = z.object({
  sleepHours: z.coerce.number().min(0).max(16),
  sleepQuality: z.coerce.number().int().min(1).max(5),
  energy: z.coerce.number().int().min(1).max(5),
  mood: z.coerce.number().int().min(1).max(5),
  weightKg: z.coerce.number().min(20).max(300).optional().or(z.literal("")),
  focusTarget: z.string().trim().min(3, "One sentence about today's focus").max(200),
  load: z.enum(["MINIMUM", "STANDARD", "SPRINT"]),
});

export type CheckinState = { error?: string; ok?: boolean };

export async function submitMorningCheckin(
  _prev: CheckinState,
  formData: FormData,
): Promise<CheckinState> {
  const raw = Object.fromEntries(formData);
  if (raw.weightKg === "") delete raw.weightKg;

  const parsed = MorningSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form" };
  }
  const input = parsed.data;

  const day = await getOrCreateDay();
  if (day.checkedInAt) {
    refresh();
    redirect("/");
  }

  const late = localMinutes() >= 12 * 60;
  const early = localMinutes() < 8 * 60;

  await prisma.$transaction(async (tx) => {
    await tx.dayLog.update({
      where: { id: day.id },
      data: {
        sleepHours: input.sleepHours,
        sleepQuality: input.sleepQuality,
        energy: input.energy,
        mood: input.mood,
        weightKg: typeof input.weightKg === "number" ? input.weightKg : null,
        focusTarget: input.focusTarget,
        load: input.load,
        checkedInAt: new Date(),
        lateCheckIn: late,
        workTargetMin:
          input.load === "MINIMUM" ? 360 : input.load === "SPRINT" ? 780 : 660,
      },
    });

    await award(tx, {
      hunterId: HUNTER_ID,
      amount: late ? XP.lateCheckin : XP.checkin + (early ? XP.checkinEarly : 0),
      reason: late ? "checkin.late" : "checkin.done",
      sourceId: day.id,
      dayId: day.id,
    });
  });

  refresh();
  redirect("/");
}

const ShutdownSchema = z.object({
  journal: z.string().trim().max(2000).optional(),
  top1: z.string().trim().max(200).optional(),
  top2: z.string().trim().max(200).optional(),
  top3: z.string().trim().max(200).optional(),
});

export async function submitShutdown(_prev: CheckinState, formData: FormData): Promise<CheckinState> {
  const parsed = ShutdownSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Check the form" };

  const day = await getOrCreateDay();
  const top3 = [parsed.data.top1, parsed.data.top2, parsed.data.top3].filter(
    (v): v is string => Boolean(v),
  );

  await prisma.$transaction(async (tx) => {
    await tx.dayLog.update({
      where: { id: day.id },
      data: { shutdownAt: new Date(), journal: parsed.data.journal ?? null, top3 },
    });
    await award(tx, {
      hunterId: HUNTER_ID,
      amount: XP.shutdown,
      reason: "shutdown.done",
      sourceId: day.id,
      dayId: day.id,
    });
  });

  refresh();
  redirect("/");
}

export async function setLoad(load: "MINIMUM" | "STANDARD" | "SPRINT") {
  const day = await getOrCreateDay();
  await prisma.dayLog.update({
    where: { id: day.id },
    data: {
      load,
      workTargetMin: load === "MINIMUM" ? 360 : load === "SPRINT" ? 780 : 660,
    },
  });
  refresh();
}
