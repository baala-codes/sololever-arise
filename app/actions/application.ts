"use server";

import { refresh } from "next/cache";
import { prisma } from "@/lib/db";
import { getOrCreateDay, HUNTER_ID } from "@/lib/day-service";
import { award } from "@/lib/xp";
import { ADVANCE_STAGES, STAGE_ORDER, XP_APPLICATION, XP_STAGE_ADVANCE } from "@/lib/readiness";
import type { AppStage } from "@/lib/generated/prisma/client";

export type ApplicationResult = {
  ok: boolean;
  error?: string;
  awarded?: number;
  leveledUp?: boolean;
  level?: number;
};

export async function addApplication(
  company: string,
  role: string,
  stage: AppStage = "APPLIED",
  url = "",
): Promise<ApplicationResult> {
  const cleanCompany = company.trim().slice(0, 120);
  if (!cleanCompany) return { ok: false, error: "Company is required." };
  if (!STAGE_ORDER.includes(stage)) return { ok: false, error: "Unknown stage." };

  const day = await getOrCreateDay();
  const result = await prisma.$transaction(async (tx) => {
    const app = await tx.application.create({
      data: {
        company: cleanCompany,
        role: role.trim().slice(0, 120) || null,
        stage,
        url: url.trim() || null,
        appliedAt: day.date,
      },
    });
    const res = await award(tx, {
      hunterId: HUNTER_ID,
      amount: XP_APPLICATION,
      reason: "app.sent",
      sourceId: app.id,
      dayId: day.id,
    });
    // an application logged straight at OA/INTERVIEW already advanced
    if (ADVANCE_STAGES.includes(stage)) {
      await award(tx, {
        hunterId: HUNTER_ID,
        amount: XP_STAGE_ADVANCE,
        reason: "app.stage",
        sourceId: `${app.id}:${stage}`,
        dayId: day.id,
      });
    }
    return res;
  });

  refresh();
  return {
    ok: true,
    awarded: result.awarded,
    leveledUp: result.leveledUp,
    level: result.level,
  };
}

export async function setApplicationStage(id: string, stage: AppStage): Promise<ApplicationResult> {
  if (!STAGE_ORDER.includes(stage)) return { ok: false, error: "Unknown stage." };

  const app = await prisma.application.findUnique({ where: { id } });
  if (!app) return { ok: false, error: "Application not found." };
  if (app.stage === stage) return { ok: true, awarded: 0 };

  const day = await getOrCreateDay();
  const result = await prisma.$transaction(async (tx) => {
    await tx.application.update({ where: { id }, data: { stage } });
    if (!ADVANCE_STAGES.includes(stage)) {
      return { awarded: 0, leveledUp: false, level: 0 };
    }
    return award(tx, {
      hunterId: HUNTER_ID,
      amount: XP_STAGE_ADVANCE,
      reason: "app.stage",
      sourceId: `${id}:${stage}`,
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

export async function deleteApplication(id: string): Promise<ApplicationResult> {
  await prisma.application.delete({ where: { id } });
  refresh();
  return { ok: true };
}
