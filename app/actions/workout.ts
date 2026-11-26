"use server";

import { refresh } from "next/cache";
import type { WorkoutSplit } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import { getOrCreateDay, HUNTER_ID } from "@/lib/day-service";
import { award, XP } from "@/lib/xp";
import { progressed } from "@/lib/workout";

export type WorkoutResult = {
  ok: boolean;
  awarded: number;
  leveledUp: boolean;
  level: number;
  completed: boolean;
};

const NOTHING: WorkoutResult = {
  ok: false,
  awarded: 0,
  leveledUp: false,
  level: 1,
  completed: false,
};

/** Materialize today's floor for a split, using each exercise's current target. */
export async function startWorkout(split: WorkoutSplit): Promise<{ ok: boolean; id: string | null }> {
  const day = await getOrCreateDay();
  const existing = await prisma.workout.findUnique({
    where: { date_split: { date: day.date, split } },
  });
  if (existing) return { ok: true, id: existing.id };

  const exercises = await prisma.exercise.findMany({
    where: { split },
    orderBy: { order: "asc" },
  });
  if (exercises.length === 0) return { ok: false, id: null };

  const workout = await prisma.workout.create({
    data: {
      dayId: day.id,
      date: day.date,
      split,
      items: {
        create: exercises.flatMap((exercise, position) =>
          Array.from({ length: exercise.sets }, (_, setIndex) => ({
            exerciseId: exercise.id,
            position,
            setIndex,
            value: exercise.currentValue,
          })),
        ),
      },
    },
  });

  refresh();
  return { ok: true, id: workout.id };
}

export async function toggleSet(itemId: string): Promise<{ ok: boolean; done: boolean }> {
  const item = await prisma.workoutItem.findUnique({
    where: { id: itemId },
    include: { workout: true },
  });
  if (!item || item.workout.completedAt) return { ok: false, done: false };

  const done = item.doneAt === null;
  await prisma.workoutItem.update({
    where: { id: itemId },
    data: { doneAt: done ? new Date() : null },
  });
  refresh();
  return { ok: true, done };
}

/** Nudge the unlogged sets of an exercise — the plan should fit the body, not the reverse. */
export async function adjustExercise(
  workoutId: string,
  exerciseId: string,
  delta: number,
): Promise<{ ok: boolean }> {
  const workout = await prisma.workout.findUnique({ where: { id: workoutId } });
  if (!workout || workout.completedAt) return { ok: false };

  const pending = await prisma.workoutItem.findMany({
    where: { workoutId, exerciseId, doneAt: null },
    select: { value: true },
  });
  if (pending.length === 0) return { ok: false };
  if (pending.some((p) => p.value + delta < 1)) return { ok: false };

  await prisma.workoutItem.updateMany({
    where: { workoutId, exerciseId, doneAt: null },
    data: { value: { increment: delta } },
  });
  refresh();
  return { ok: true };
}

/**
 * Clear the floor. Pays XP once, and bumps every exercise that was hit in full
 * so tomorrow's floor is slightly heavier.
 */
export async function completeWorkout(workoutId: string): Promise<WorkoutResult> {
  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    include: { items: { include: { exercise: true } } },
  });
  if (!workout || workout.completedAt) return NOTHING;
  if (workout.items.length === 0 || workout.items.some((i) => !i.doneAt)) return NOTHING;

  const byExercise = new Map<string, { done: boolean; full: boolean; exerciseId: string }>();
  for (const item of workout.items) {
    const entry = byExercise.get(item.exerciseId) ?? { done: true, full: true, exerciseId: item.exerciseId };
    entry.full = entry.full && item.value >= item.exercise.currentValue;
    byExercise.set(item.exerciseId, entry);
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.workout.update({ where: { id: workout.id }, data: { completedAt: new Date() } });

    for (const entry of byExercise.values()) {
      if (!entry.full) continue;
      const exercise = workout.items.find((i) => i.exerciseId === entry.exerciseId)!.exercise;
      await tx.exercise.update({
        where: { id: exercise.id },
        data: { currentValue: progressed(exercise.currentValue, exercise.increment, exercise.cap) },
      });
    }

    const awarded = await award(tx, {
      hunterId: HUNTER_ID,
      amount: XP.workoutClear,
      reason: "workout.clear",
      sourceId: workout.id,
      dayId: workout.dayId,
    });

    await tx.workout.update({ where: { id: workout.id }, data: { xp: awarded.awarded } });

    return {
      ok: true,
      awarded: awarded.awarded,
      leveledUp: awarded.leveledUp,
      level: awarded.level,
      completed: true,
    };
  });

  refresh();
  return result;
}

/** Discard an unfinished floor so a mis-tap doesn't leave a half-logged day. */
export async function resetWorkout(workoutId: string): Promise<{ ok: boolean }> {
  const workout = await prisma.workout.findUnique({ where: { id: workoutId } });
  if (!workout || workout.completedAt) return { ok: false };
  await prisma.workout.delete({ where: { id: workoutId } });
  refresh();
  return { ok: true };
}
