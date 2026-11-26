import type { AppStage } from "@/lib/generated/prisma/client";

/**
 * Interview readiness for an SDE-1 offer, weighted the way the plan specifies:
 * problems 40 · patterns 20 · cohort 15 · projects 15 · applications 10.
 * Every input is derived from stored rows — nothing here is hand-entered.
 */
export const READINESS_TARGET = {
  solvedProblems: 150,
  patterns: 19,
  cohortDays: 60,
  projectsSubmitted: 2,
  applications: 30,
} as const;

const PARTS = [
  { key: "problems", label: "Problems solved", weight: 40, target: READINESS_TARGET.solvedProblems },
  { key: "patterns", label: "Pattern coverage", weight: 20, target: READINESS_TARGET.patterns },
  { key: "cohort", label: "Cohort days", weight: 15, target: READINESS_TARGET.cohortDays },
  { key: "projects", label: "Hackathons shipped", weight: 15, target: READINESS_TARGET.projectsSubmitted },
  { key: "applications", label: "Applications sent", weight: 10, target: READINESS_TARGET.applications },
] as const;

export type ReadinessKey = (typeof PARTS)[number]["key"];

export type ReadinessInput = Record<ReadinessKey, number>;

export type ReadinessPart = {
  key: ReadinessKey;
  label: string;
  value: number;
  target: number;
  ratio: number;
  weight: number;
  points: number;
};

export function readiness(input: ReadinessInput): { score: number; parts: ReadinessPart[] } {
  const parts = PARTS.map((p) => {
    const value = Math.max(0, Math.round(input[p.key]));
    const ratio = Math.min(1, value / p.target);
    return {
      key: p.key,
      label: p.label,
      value,
      target: p.target,
      ratio,
      weight: p.weight,
      points: Math.round(ratio * p.weight),
    };
  });
  const score = parts.reduce((sum, p) => sum + p.points, 0);
  return { score, parts };
}

export function readinessBand(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "OFFER RANGE", color: "#2BD98A" };
  if (score >= 60) return { label: "INTERVIEW READY", color: "#4DA3FF" };
  if (score >= 35) return { label: "BUILDING", color: "#E8A33D" };
  return { label: "FOUNDATION", color: "#FF3B4E" };
}

export const STAGE_ORDER: AppStage[] = ["APPLIED", "OA", "INTERVIEW", "OFFER", "REJECTED"];

export const STAGE_META: Record<AppStage, { label: string; color: string }> = {
  APPLIED: { label: "APPLIED", color: "#8496AD" },
  OA: { label: "OA", color: "#4DA3FF" },
  INTERVIEW: { label: "INTERVIEW", color: "#8B5CF6" },
  OFFER: { label: "OFFER", color: "#2BD98A" },
  REJECTED: { label: "REJECTED", color: "#FF3B4E" },
};

export const XP_APPLICATION = 40;
export const XP_STAGE_ADVANCE = 120;

/** Stages that pay stage-advance XP, in order. */
export const ADVANCE_STAGES: AppStage[] = ["OA", "INTERVIEW", "OFFER"];
