import type { ReviewGrade } from "@/lib/generated/prisma/client";
import { dateKeyToDbDate, localDateKey } from "@/lib/day";

const MIN_EASE = 1.3;
const MAX_EASE = 3.2;
const MAX_INTERVAL = 180;

export const GRADE_XP: Record<ReviewGrade, number> = {
  AGAIN: 10,
  HARD: 15,
  GOOD: 20,
  EASY: 30,
};

export const GRADE_LABEL: Record<ReviewGrade, string> = {
  AGAIN: "again",
  HARD: "hard",
  GOOD: "good",
  EASY: "easy",
};

/**
 * SM-2-lite. A miss resets the interval to a day and costs ease; a confident
 * recall stretches it by the ease factor. Everything is measured in whole days.
 */
export function schedule(
  ease: number,
  intervalDays: number,
  grade: ReviewGrade,
): { ease: number; intervalDays: number; dueAt: Date } {
  let nextEase = ease;
  let nextInterval = intervalDays;

  switch (grade) {
    case "AGAIN":
      nextEase = ease - 0.2;
      nextInterval = 1;
      break;
    case "HARD":
      nextEase = ease - 0.15;
      nextInterval = intervalDays <= 1 ? 1 : Math.round(intervalDays * 1.2);
      break;
    case "GOOD":
      nextInterval = intervalDays <= 0 ? 1 : Math.round(intervalDays * ease);
      break;
    case "EASY":
      nextEase = ease + 0.15;
      nextInterval = intervalDays <= 0 ? 2 : Math.round(intervalDays * ease * 1.3);
      break;
  }

  nextEase = Math.min(MAX_EASE, Math.max(MIN_EASE, nextEase));
  nextInterval = Math.min(MAX_INTERVAL, Math.max(1, nextInterval));

  return { ease: nextEase, intervalDays: nextInterval, dueAt: addDays(localDateKey(), nextInterval) };
}

export function addDays(dateKey: string, days: number): Date {
  const d = new Date(`${dateKey}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return dateKeyToDbDate(d.toISOString().slice(0, 10));
}

/** Problems whose review is due today or already overdue. */
export function isDue(dueAt: Date | null, todayKey = localDateKey()): boolean {
  if (!dueAt) return false;
  return dueAt.toISOString().slice(0, 10) <= todayKey;
}
