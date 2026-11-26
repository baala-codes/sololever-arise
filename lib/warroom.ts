import type { AgentStatus, ProjectPhase } from "@/lib/generated/prisma/client";

export const AGENT_ORDER: AgentStatus[] = ["DISPATCHED", "RUNNING", "REVIEW", "MERGED"];

export const AGENT_META: Record<
  AgentStatus,
  { label: string; color: string; hint: string; terminal: boolean }
> = {
  DISPATCHED: {
    label: "DISPATCHED",
    color: "#8496AD",
    hint: "queued, not burning a slot yet",
    terminal: false,
  },
  RUNNING: {
    label: "RUNNING",
    color: "#8B5CF6",
    hint: "agent working · leave it alone",
    terminal: false,
  },
  REVIEW: {
    label: "REVIEW",
    color: "#E8A33D",
    hint: "output ready · you read it before merging",
    terminal: false,
  },
  MERGED: {
    label: "MERGED",
    color: "#2BD98A",
    hint: "landed · 60 XP",
    terminal: true,
  },
  ABANDONED: {
    label: "ABANDONED",
    color: "#FF3B4E",
    hint: "dropped · no XP",
    terminal: true,
  },
};

export const PHASE_ORDER: ProjectPhase[] = ["IDEA", "BUILD", "POLISH", "SUBMITTED"];

export const PHASE_META: Record<ProjectPhase, { label: string; color: string }> = {
  IDEA: { label: "IDEA", color: "#8496AD" },
  BUILD: { label: "BUILD", color: "#4DA3FF" },
  POLISH: { label: "POLISH", color: "#E8A33D" },
  SUBMITTED: { label: "SUBMITTED", color: "#2BD98A" },
};

export const XP_AGENT_MERGED = 60;
export const XP_HACKATHON_SUBMIT = 400;

/** Next state in the lane, or null when the lane is closed. */
export function nextAgentStatus(status: AgentStatus): AgentStatus | null {
  if (status === "MERGED" || status === "ABANDONED") return null;
  const index = AGENT_ORDER.indexOf(status);
  return AGENT_ORDER[index + 1] ?? null;
}

/** Days from `from` (a local-midnight date) to `to`; negative means overdue. */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

export function countdownLabel(days: number): string {
  if (days === 0) return "due today";
  if (days < 0) return `${Math.abs(days)}d overdue`;
  return `${days}d left`;
}
