"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useClock } from "@/lib/use-clock";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { beginRound, finishRound, logSwitch } from "@/app/actions/session";
import { formatClock, progress, remainingMs } from "@/lib/timer";
import { play, unlockAudio } from "@/lib/sound";
import { notifyRoundEnd } from "@/lib/notify";
import { LevelUpOverlay } from "@/components/level-up";

export type RunnerRound = {
  id: string;
  index: number;
  kind: string;
  plannedMs: number;
  startedAt: string | null;
  focusedMs: number;
  status: string;
};

const RING = 2 * Math.PI * 108;

export function Runner({
  sessionId,
  blockTitle,
  subtitle,
  microTasks,
  rounds: initial,
  switches,
}: {
  sessionId: string;
  blockTitle: string;
  subtitle: string | null;
  microTasks: string[];
  rounds: RunnerRound[];
  switches: number;
}) {
  const [rounds, setRounds] = useState<RunnerRound[]>(initial);
  const now = useClock();
  const [toast, setToast] = useState<string | null>(null);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const hiddenRef = useRef(0);
  const finishingRef = useRef<Set<string>>(new Set());
  const reduce = useReducedMotion();

  const active = rounds.find((r) => r.status === "PENDING" || r.status === "RUNNING") ?? null;
  const focusRounds = rounds.filter((r) => r.kind === "focus");
  const doneFocus = focusRounds.filter((r) => r.status === "DONE").length;
  const totalFocus = focusRounds.length;
  const allDone = active === null;

  // Count only time the tab was actually visible while this round ran.
  useEffect(() => {
    hiddenRef.current = 0;
    if (!active || active.status !== "RUNNING") return;
    let hiddenAt: number | null = document.hidden ? Date.now() : null;
    const onVis = () => {
      if (document.hidden) hiddenAt = Date.now();
      else if (hiddenAt !== null) {
        hiddenRef.current += Date.now() - hiddenAt;
        hiddenAt = null;
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      if (hiddenAt !== null) hiddenRef.current += Date.now() - hiddenAt;
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [active]);

  const finish = useCallback(
    async (round: RunnerRound, mode: "auto" | "manual" | "abandon") => {
      if (finishingRef.current.has(round.id)) return;
      finishingRef.current.add(round.id);
      setBusy(true);

      const startedAt = round.startedAt ? new Date(round.startedAt).getTime() : Date.now();
      const visible = Math.max(0, Date.now() - startedAt - hiddenRef.current);
      const focused = Math.min(round.plannedMs, visible);

      const res = await finishRound(round.id, focused);

      setRounds((prev) =>
        prev.map((r) =>
          r.id === round.id
            ? { ...r, status: res.completed ? "DONE" : "ABANDONED", focusedMs: focused }
            : r,
        ),
      );

      if (mode !== "abandon" || res.completed) play("roundEnd");
      if (res.completed && document.hidden) {
        void notifyRoundEnd("ROUND COMPLETE", `${blockTitle} · log it before you drift.`, "/");
      }
      if (res.awarded > 0) {
        setToast(`+${res.awarded} XP`);
        window.setTimeout(() => setToast(null), 1600);
      }
      if (res.leveledUp) setLevelUp(res.level);
      setBusy(false);
    },
    [blockTitle],
  );

  // Round hit zero (possibly while the tab was closed).
  useEffect(() => {
    if (!active || active.status !== "RUNNING" || active.startedAt === null || now === 0) return;
    const left = remainingMs(
      {
        ...active,
        startedAt: new Date(active.startedAt).getTime(),
        pausedTotalMs: 0,
        pausedAt: null,
      },
      now,
    );
    if (left <= 0) void finish(active, "auto");
  }, [active, now, finish]);

  async function start(round: RunnerRound) {
    unlockAudio();
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      void Notification.requestPermission();
    }
    setRounds((prev) =>
      prev.map((r) =>
        r.id === round.id ? { ...r, status: "RUNNING", startedAt: new Date().toISOString() } : r,
      ),
    );
    await beginRound(round.id);
  }

  const startedAtMs = active?.startedAt ? new Date(active.startedAt).getTime() : null;
  const timerRound =
    active && startedAtMs !== null
      ? { ...active, startedAt: startedAtMs, pausedTotalMs: 0, pausedAt: null }
      : null;
  const ratio = timerRound ? progress(timerRound, now) : 0;
  const left =
    timerRound && active?.status === "RUNNING" ? remainingMs(timerRound, now) : (active?.plannedMs ?? 0);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <LevelUpOverlay level={levelUp} onDone={() => setLevelUp(null)} />

      <div className="panel panel-brackets relative overflow-hidden">
        <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <div className="label">slot running</div>
            <h1 className="truncate text-base font-semibold text-fg">{blockTitle}</h1>
            {subtitle ? <p className="truncate text-[11px] text-muted">{subtitle}</p> : null}
          </div>
          <div className="shrink-0 text-right text-[10px] text-muted">
            <div className="tabular-nums text-system">
              {doneFocus}/{totalFocus} rounds
            </div>
            <div>{switches} switches</div>
          </div>
        </div>

        <div className="relative grid place-items-center px-4 py-8">
          <svg viewBox="0 0 240 240" className="size-56 -rotate-90 md:size-64">
            <circle cx="120" cy="120" r="108" fill="none" stroke="#1E2733" strokeWidth="2" />
            <circle
              cx="120"
              cy="120"
              r="108"
              fill="none"
              stroke={active?.kind === "break" ? "#2BD98A" : "#4DA3FF"}
              strokeWidth="3"
              strokeDasharray={RING}
              strokeDashoffset={RING * (1 - ratio)}
              strokeLinecap="butt"
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <div className="label">{active ? (active.kind === "break" ? "break" : "focus") : "complete"}</div>
              <div className="mt-1 text-5xl font-semibold tabular-nums text-fg">
                {allDone ? "--:--" : formatClock(left)}
              </div>
              <div className="mt-1 text-[10px] text-muted">
                {active
                  ? `round ${active.index + 1} / ${rounds.length}`
                  : `${doneFocus}/${totalFocus} focus rounds banked`}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3">
          {allDone ? (
            <Link
              href="/"
              className="flex-1 border border-ok/50 bg-ok/10 px-3 py-2 text-center text-xs tracking-[0.2em] text-ok hover:bg-ok/20"
            >
              BACK TO STATUS
            </Link>
          ) : active?.status === "PENDING" ? (
            <button
              type="button"
              onClick={() => void start(active)}
              className="flex-1 border border-system/50 bg-system/10 px-3 py-2 text-xs tracking-[0.2em] text-system hover:bg-system/20"
            >
              {active.kind === "break" ? "START BREAK" : "START ROUND"} ▶
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => active && void finish(active, "manual")}
                className="flex-1 border border-system/50 bg-system/10 px-3 py-2 text-xs tracking-[0.2em] text-system hover:bg-system/20 disabled:opacity-50"
              >
                COMPLETE ROUND
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => active && void finish(active, "abandon")}
                className="border border-line px-3 py-2 text-xs tracking-[0.16em] text-muted hover:border-danger/40 hover:text-danger disabled:opacity-50"
              >
                ABANDON
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => void logSwitch(sessionId)}
            className="border border-line px-3 py-2 text-[10px] tracking-[0.14em] text-muted hover:border-line2 hover:text-fg"
            title="Counts against the 6/day budget"
          >
            DISTRACTED +1
          </button>
        </div>

        <div className="scanline" aria-hidden />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="panel panel-brackets">
          <div className="border-b border-line px-4 py-2">
            <span className="label">break tasks</span>
          </div>
          <ul className="px-4 py-3 text-[11px] text-muted">
            {microTasks.length === 0 ? (
              <li>Stand, water, look 20 feet away.</li>
            ) : (
              microTasks.map((task) => (
                <li key={task} className="flex items-center gap-2 py-0.5">
                  <span className="text-system/60">▸</span>
                  {task}
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="panel panel-brackets">
          <div className="border-b border-line px-4 py-2">
            <span className="label">rounds</span>
          </div>
          <ol className="px-4 py-3">
            {rounds.map((r) => (
              <li key={r.id} className="flex items-center gap-2 py-0.5 text-[11px]">
                <span
                  className={`size-1.5 ${
                    r.status === "DONE"
                      ? "bg-ok"
                      : r.status === "RUNNING"
                        ? "bg-system ring-live"
                        : r.status === "ABANDONED"
                          ? "bg-danger/60"
                          : "bg-line2"
                  }`}
                />
                <span className="w-14 text-muted">{r.kind}</span>
                <span className="tabular-nums text-fg/80">{Math.round(r.plannedMs / 60000)}m</span>
                <span className="ml-auto text-[9px] tracking-[0.14em] text-muted/70">
                  {r.status}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <AnimatePresence>
        {toast ? (
          <motion.div
            className="pointer-events-none fixed bottom-24 left-1/2 z-50 -translate-x-1/2 border border-ok/40 bg-panel px-4 py-2 text-xs text-ok md:bottom-8"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {toast}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
