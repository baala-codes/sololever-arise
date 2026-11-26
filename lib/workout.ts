import type { WorkoutSplit } from "@/lib/generated/prisma/client";

export const SPLIT_META: Record<WorkoutSplit, { label: string; focus: string; block: string }> = {
  A: { label: "BLOCK A", focus: "pull + push", block: "Workout — block A" },
  B: { label: "BLOCK B", focus: "core + legs", block: "Workout block B + journal + shutdown" },
};

export const XP_WORKOUT_CLEAR = 150;

/** Next target after a fully-hit session: add the increment, stop at the cap. */
export function progressed(currentValue: number, increment: number, cap: number | null): number {
  const next = currentValue + increment;
  return cap !== null ? Math.min(cap, next) : next;
}

export function unitLabel(unit: "REPS" | "SECONDS"): string {
  return unit === "SECONDS" ? "s" : "reps";
}

/** e.g. "3 × 12 reps" or "3 × 45s" */
export function prescription(sets: number, value: number, unit: "REPS" | "SECONDS"): string {
  return unit === "SECONDS" ? `${sets} × ${value}s` : `${sets} × ${value}`;
}

export function totalVolume(items: { value: number; doneAt: Date | null }[]): number {
  return items.filter((i) => i.doneAt).reduce((sum, i) => sum + i.value, 0);
}
