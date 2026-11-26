"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { ReviewGrade } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import { localDateKey } from "@/lib/day";
import { getOrCreateDay, HUNTER_ID } from "@/lib/day-service";
import { award, XP } from "@/lib/xp";
import { GRADE_XP, schedule } from "@/lib/srs";

const PATTERNS = [
  "ARRAYS",
  "STRINGS",
  "HASHMAP",
  "TWO_POINTERS",
  "SLIDING_WINDOW",
  "BINARY_SEARCH",
  "STACK",
  "LINKED_LIST",
  "TREES",
  "HEAP",
  "GRAPHS",
  "DP",
  "GREEDY",
  "BACKTRACKING",
  "TRIES",
  "BITS",
  "MATH",
  "INTERVALS",
  "DESIGN",
] as const;

const AddSchema = z.object({
  title: z.string().trim().min(2, "Problem name is required").max(160),
  url: z.string().trim().max(400).optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  pattern: z.enum(PATTERNS),
});

export type ProblemState = { error?: string; ok?: boolean; slug?: string };

export async function addProblem(_prev: ProblemState, formData: FormData): Promise<ProblemState> {
  const parsed = AddSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form" };

  const { title, difficulty, pattern } = parsed.data;
  const rawUrl = parsed.data.url || undefined;

  // Accept a pasted LeetCode link and take its slug as the identity of the problem.
  const urlSlug = rawUrl?.match(/problems\/([^/?#]+)/)?.[1];
  const base = slugify(urlSlug ?? title);
  if (!base) return { error: "Could not derive a name from that" };

  let slug = base;
  for (let i = 2; i < 50; i++) {
    const clash = await prisma.problem.findUnique({ where: { slug } });
    if (!clash) break;
    slug = `${base}-${i}`;
  }

  await prisma.problem.create({
    data: {
      slug,
      title,
      url: rawUrl ?? `https://leetcode.com/problems/${base}/`,
      difficulty,
      pattern,
    },
  });

  refresh();
  return { ok: true, slug };
}

export type GradeResult = {
  ok: boolean;
  awarded: number;
  leveledUp: boolean;
  level: number;
  intervalDays: number;
};

/** Grade a recall. First solve pays difficulty XP; later reviews pay per-grade XP. */
export async function gradeProblem(problemId: string, grade: ReviewGrade): Promise<GradeResult> {
  const problem = await prisma.problem.findUnique({ where: { id: problemId } });
  if (!problem) return { ok: false, awarded: 0, leveledUp: false, level: 1, intervalDays: 0 };

  const next = schedule(problem.ease, problem.intervalDays, grade);
  const firstSolve = problem.status === "TODO";
  const day = await getOrCreateDay();

  const result = await prisma.$transaction(async (tx) => {
    const review = await tx.review.create({
      data: {
        problemId: problem.id,
        grade,
        intervalDays: next.intervalDays,
      },
    });

    await tx.problem.update({
      where: { id: problem.id },
      data: {
        ease: next.ease,
        intervalDays: next.intervalDays,
        dueAt: next.dueAt,
        attempts: { increment: 1 },
        status: grade === "AGAIN" ? "REVISIT" : "SOLVED",
        solvedAt: problem.solvedAt ?? new Date(),
      },
    });

    const awarded = firstSolve
      ? await award(tx, {
          hunterId: HUNTER_ID,
          amount: XP.problem[problem.difficulty],
          reason: `dsa.${problem.difficulty.toLowerCase()}`,
          sourceId: problem.id,
          dayId: day.id,
        })
      : await award(tx, {
          hunterId: HUNTER_ID,
          amount: GRADE_XP[grade],
          reason: "dsa.review",
          sourceId: review.id,
          dayId: day.id,
        });

    return {
      ok: true,
      awarded: awarded.awarded,
      leveledUp: awarded.leveledUp,
      level: awarded.level,
      intervalDays: next.intervalDays,
    };
  });

  refresh();
  return result;
}

export async function setProblemStatus(
  problemId: string,
  status: "TODO" | "SOLVED" | "REVISIT",
): Promise<{ ok: boolean }> {
  await prisma.problem.update({
    where: { id: problemId },
    data: { status, dueAt: status === "TODO" ? null : undefined },
  });
  refresh();
  return { ok: true };
}

export async function deleteProblem(problemId: string): Promise<{ ok: boolean }> {
  await prisma.problem.delete({ where: { id: problemId } });
  refresh();
  return { ok: true };
}

export async function nudgeDue(problemId: string, days: number): Promise<{ ok: boolean }> {
  const problem = await prisma.problem.findUnique({ where: { id: problemId } });
  if (!problem) return { ok: false };
  const base = new Date(`${localDateKey()}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + days);
  await prisma.problem.update({ where: { id: problemId }, data: { dueAt: base } });
  refresh();
  return { ok: true };
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}
