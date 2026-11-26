export type TimerRound = {
  id: string;
  kind: "focus" | "break" | string;
  plannedMs: number;
  startedAt: number | null;
  pausedTotalMs: number;
  pausedAt: number | null;
};

/** Everything is derived from absolute timestamps — a closed tab never desyncs the clock. */
export function elapsedMs(r: TimerRound, now: number): number {
  if (r.startedAt === null) return 0;
  const pausedNow = r.pausedAt ? now - r.pausedAt : 0;
  return Math.max(0, now - r.startedAt - r.pausedTotalMs - pausedNow);
}

export function remainingMs(r: TimerRound, now: number): number {
  if (r.startedAt === null) return r.plannedMs;
  return Math.max(0, r.plannedMs - elapsedMs(r, now));
}

export function progress(r: TimerRound, now: number): number {
  if (r.plannedMs <= 0) return 1;
  return Math.min(1, elapsedMs(r, now) / r.plannedMs);
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 60_000));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}
