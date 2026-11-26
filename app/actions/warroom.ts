"use server";

import { refresh } from "next/cache";
import { prisma } from "@/lib/db";
import { getOrCreateDay, HUNTER_ID } from "@/lib/day-service";
import { award } from "@/lib/xp";
import {
  nextAgentStatus,
  PHASE_ORDER,
  XP_AGENT_MERGED,
  XP_HACKATHON_SUBMIT,
} from "@/lib/warroom";
import type { AgentStatus, ProjectPhase } from "@/lib/generated/prisma/client";

export type WarRoomResult = {
  ok: boolean;
  error?: string;
  id?: string;
  awarded?: number;
  leveledUp?: boolean;
  level?: number;
  status?: AgentStatus;
};

const MAX_TITLE = 120;
const MAX_NOTE = 400;

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "project"
  );
}

/* ---------------- shadow lanes ---------------- */

export async function dispatchAgent(
  title: string,
  note = "",
  projectId: string | null = null,
): Promise<WarRoomResult> {
  const clean = title.trim().slice(0, MAX_TITLE);
  if (!clean) return { ok: false, error: "Name the task before dispatching." };

  const day = await getOrCreateDay();
  const agent = await prisma.agent.create({
    data: {
      dayId: day.id,
      date: day.date,
      title: clean,
      note: note.trim().slice(0, MAX_NOTE) || null,
      projectId,
      status: "DISPATCHED",
    },
  });

  refresh();
  return { ok: true, status: "DISPATCHED", id: agent.id };
}

/** Push a lane to its next state. Merging pays XP exactly once per agent. */
export async function advanceAgent(id: string): Promise<WarRoomResult> {
  const agent = await prisma.agent.findUnique({ where: { id } });
  if (!agent) return { ok: false, error: "Lane not found." };

  const next = nextAgentStatus(agent.status);
  if (!next) return { ok: false, error: "Lane is already closed." };

  if (next !== "MERGED") {
    await prisma.agent.update({ where: { id }, data: { status: next, needsMe: false } });
    refresh();
    return { ok: true, status: next };
  }

  const day = await getOrCreateDay();
  const result = await prisma.$transaction(async (tx) => {
    const res = await award(tx, {
      hunterId: HUNTER_ID,
      amount: XP_AGENT_MERGED,
      reason: "agent.merged",
      sourceId: agent.id,
      dayId: day.id,
    });
    await tx.agent.update({
      where: { id },
      data: {
        status: "MERGED",
        needsMe: false,
        mergedAt: new Date(),
        xp: res.awarded,
      },
    });
    return res;
  });

  refresh();
  return {
    ok: true,
    status: "MERGED",
    awarded: result.awarded,
    leveledUp: result.leveledUp,
    level: result.level,
  };
}

export async function toggleNeedsMe(id: string, value: boolean): Promise<WarRoomResult> {
  await prisma.agent.update({ where: { id }, data: { needsMe: value } });
  refresh();
  return { ok: true };
}

export async function abandonAgent(id: string): Promise<WarRoomResult> {
  const agent = await prisma.agent.findUnique({ where: { id } });
  if (!agent) return { ok: false, error: "Lane not found." };
  if (agent.status === "MERGED") return { ok: false, error: "Merged lanes stay merged." };

  await prisma.agent.update({ where: { id }, data: { status: "ABANDONED", needsMe: false } });
  refresh();
  return { ok: true, status: "ABANDONED" };
}

/* ---------------- projects ---------------- */

export async function createProject(
  name: string,
  deadline: string | null,
  repoUrl = "",
): Promise<WarRoomResult> {
  const clean = name.trim().slice(0, MAX_TITLE);
  if (!clean) return { ok: false, error: "Name the project." };

  const base = slugify(clean);
  let slug = base;
  for (let i = 2; await prisma.project.findUnique({ where: { slug } }); i += 1) {
    slug = `${base}-${i}`;
  }

  await prisma.project.create({
    data: {
      slug,
      name: clean,
      deadline: deadline ? new Date(`${deadline}T00:00:00.000Z`) : null,
      repoUrl: repoUrl.trim() || null,
    },
  });

  refresh();
  return { ok: true };
}

export async function setPhase(projectId: string, phase: ProjectPhase): Promise<WarRoomResult> {
  if (!PHASE_ORDER.includes(phase) || phase === "SUBMITTED") {
    return { ok: false, error: "Submit through the checklist, not the phase selector." };
  }
  await prisma.project.update({ where: { id: projectId }, data: { phase } });
  refresh();
  return { ok: true };
}

export async function addChecklistItem(projectId: string, label: string): Promise<WarRoomResult> {
  const clean = label.trim().slice(0, 160);
  if (!clean) return { ok: false, error: "Checklist item needs a label." };

  const count = await prisma.checklistItem.count({ where: { projectId } });
  await prisma.checklistItem.create({
    data: { projectId, label: clean, order: count },
  });
  refresh();
  return { ok: true };
}

export async function toggleChecklistItem(id: string): Promise<WarRoomResult> {
  const item = await prisma.checklistItem.findUnique({ where: { id } });
  if (!item) return { ok: false, error: "Item not found." };

  await prisma.checklistItem.update({
    where: { id },
    data: { doneAt: item.doneAt ? null : new Date() },
  });
  refresh();
  return { ok: true };
}

export async function removeChecklistItem(id: string): Promise<WarRoomResult> {
  await prisma.checklistItem.delete({ where: { id } });
  refresh();
  return { ok: true };
}

export async function deleteProject(projectId: string): Promise<WarRoomResult> {
  await prisma.project.delete({ where: { id: projectId } });
  refresh();
  return { ok: true };
}

/** Submission is gated on a complete checklist — that is the whole point of it. */
export async function submitProject(projectId: string): Promise<WarRoomResult> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { checklist: true },
  });
  if (!project) return { ok: false, error: "Project not found." };
  if (project.phase === "SUBMITTED") return { ok: false, error: "Already submitted." };
  if (project.checklist.length === 0) {
    return { ok: false, error: "Add at least one checklist item before submitting." };
  }
  const open = project.checklist.filter((i) => !i.doneAt);
  if (open.length > 0) {
    return { ok: false, error: `${open.length} checklist item(s) still open.` };
  }

  const day = await getOrCreateDay();
  const result = await prisma.$transaction(async (tx) => {
    const res = await award(tx, {
      hunterId: HUNTER_ID,
      amount: XP_HACKATHON_SUBMIT,
      reason: "hackathon.submit",
      sourceId: project.id,
      dayId: day.id,
    });
    await tx.project.update({
      where: { id: project.id },
      data: { phase: "SUBMITTED" },
    });
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
