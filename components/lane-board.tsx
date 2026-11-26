"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  abandonAgent,
  advanceAgent,
  dispatchAgent,
  toggleNeedsMe,
} from "@/app/actions/warroom";
import { LevelUpOverlay } from "@/components/level-up";
import { AGENT_META, nextAgentStatus } from "@/lib/warroom";
import type { AgentStatus } from "@/lib/generated/prisma/client";

export type Lane = {
  id: string;
  title: string;
  note: string | null;
  status: AgentStatus;
  needsMe: boolean;
  project: string | null;
  xp: number;
};

const ACTIVE: AgentStatus[] = ["DISPATCHED", "RUNNING", "REVIEW"];

export function LaneBoard({
  lanes: initial,
  projects,
}: {
  lanes: Lane[];
  projects: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [lanes, setLanes] = useState(initial);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [projectId, setProjectId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  const active = lanes.filter((l) => ACTIVE.includes(l.status));
  const closed = lanes.filter((l) => !ACTIVE.includes(l.status));
  const needsMe = active.filter((l) => l.needsMe).length;

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 1800);
  }

  function dispatch(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await dispatchAgent(title, note, projectId || null);
      if (!res.ok || !res.id) {
        setError(res.error ?? "Dispatch failed.");
        return;
      }
      // router.refresh() alone never shows the new lane: `lanes` lives in local state.
      setLanes((prev) => [
        {
          id: res.id as string,
          title: title.trim(),
          note: note.trim() || null,
          status: "DISPATCHED" as const,
          needsMe: false,
          project: projects.find((p) => p.id === projectId)?.name ?? null,
          xp: 0,
        },
        ...prev,
      ]);
      setTitle("");
      setNote("");
      setProjectId("");
      router.refresh();
    });
  }

  function advance(lane: Lane) {
    const next = nextAgentStatus(lane.status);
    if (!next) return;
    startTransition(async () => {
      const res = await advanceAgent(lane.id);
      if (!res.ok) {
        setError(res.error ?? "Lane is closed.");
        return;
      }
      setLanes((prev) =>
        prev.map((l) => (l.id === lane.id ? { ...l, status: next, needsMe: false } : l)),
      );
      if (res.awarded) flash(`+${res.awarded} XP · agent merged`);
      if (res.leveledUp && res.level !== undefined) setLevelUp(res.level);
      router.refresh();
    });
  }

  function flag(lane: Lane) {
    const value = !lane.needsMe;
    setLanes((prev) => prev.map((l) => (l.id === lane.id ? { ...l, needsMe: value } : l)));
    startTransition(async () => {
      await toggleNeedsMe(lane.id, value);
      router.refresh();
    });
  }

  function drop(lane: Lane) {
    setLanes((prev) =>
      prev.map((l) => (l.id === lane.id ? { ...l, status: "ABANDONED" as const } : l)),
    );
    startTransition(async () => {
      await abandonAgent(lane.id);
      router.refresh();
    });
  }

  return (
    <div>
      <LevelUpOverlay level={levelUp} onDone={() => setLevelUp(null)} />

      <div className="flex items-center justify-between border-b border-line px-4 py-2 text-[10px] tracking-[0.14em] text-muted">
        <span>SHADOW LANES</span>
        <span className="tabular-nums">
          {active.length} active{needsMe > 0 ? ` · ${needsMe} need you` : ""}
        </span>
      </div>

      <form onSubmit={dispatch} className="space-y-2 border-b border-line px-4 py-3">
        <div className="flex gap-1.5">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="what should the agent do?"
            maxLength={120}
            className="min-w-0 flex-1 border border-line bg-panel2 px-2 py-1.5 text-xs text-fg placeholder:text-muted/50 focus:border-system/60 focus:outline-none"
          />
          <button
            type="submit"
            disabled={pending || !title.trim()}
            className="shrink-0 border border-shadow/50 bg-shadow/10 px-3 py-1.5 text-[10px] tracking-[0.14em] text-shadow transition-colors hover:bg-shadow/20 disabled:opacity-40"
          >
            DISPATCH
          </button>
        </div>
        <div className="flex gap-1.5">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="repo / branch / acceptance note (optional)"
            maxLength={400}
            className="min-w-0 flex-[2] border border-line bg-panel2 px-2 py-1 text-[11px] text-fg placeholder:text-muted/50 focus:border-line2 focus:outline-none"
          />
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="min-w-0 flex-1 border border-line bg-panel2 px-2 py-1 text-[11px] text-muted focus:border-line2 focus:outline-none"
          >
            <option value="">no project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        {error ? <p className="text-[10px] text-danger">{error}</p> : null}
      </form>

      {active.length === 0 ? (
        <p className="px-4 py-4 text-[11px] text-muted">
          No lanes open. Dispatch one task, then go back to your own lane — the agent works either
          way.
        </p>
      ) : (
        <ul className="divide-y divide-line/60">
          {active.map((lane) => {
            const meta = AGENT_META[lane.status];
            const next = nextAgentStatus(lane.status);
            return (
              <li key={lane.id} className="px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`size-1.5 shrink-0 ${lane.status === "RUNNING" ? "ring-live" : ""}`}
                    style={{ background: meta.color }}
                  />
                  <span className="min-w-0 flex-1 truncate text-xs text-fg">{lane.title}</span>
                  {lane.needsMe ? (
                    <motion.span
                      className="shrink-0 border border-amber/50 bg-amber/10 px-1.5 py-0.5 text-[8px] tracking-[0.14em] text-amber"
                      animate={{ opacity: [0.55, 1, 0.55] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      NEEDS YOU
                    </motion.span>
                  ) : null}
                  <span className="shrink-0 text-[9px] tracking-[0.12em]" style={{ color: meta.color }}>
                    {meta.label}
                  </span>
                </div>

                {lane.note || lane.project ? (
                  <p className="mt-0.5 truncate pl-3.5 text-[10px] text-muted/70">
                    {lane.project ? `[${lane.project}] ` : ""}
                    {lane.note ?? meta.hint}
                  </p>
                ) : null}

                <div className="mt-1.5 flex gap-1.5 pl-3.5">
                  {next ? (
                    <button
                      type="button"
                      onClick={() => advance(lane)}
                      disabled={pending}
                      className="flex-1 border border-shadow/40 px-2 py-1 text-[9px] tracking-[0.14em] text-shadow transition-colors hover:bg-shadow/10 disabled:opacity-40"
                    >
                      → {AGENT_META[next].label}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => flag(lane)}
                    disabled={pending}
                    className={`border px-2 py-1 text-[9px] tracking-[0.14em] transition-colors disabled:opacity-40 ${
                      lane.needsMe
                        ? "border-amber/50 text-amber hover:bg-amber/10"
                        : "border-line text-muted hover:text-fg"
                    }`}
                  >
                    {lane.needsMe ? "UNFLAG" : "FLAG ME"}
                  </button>
                  <button
                    type="button"
                    onClick={() => drop(lane)}
                    disabled={pending}
                    className="border border-line px-2 py-1 text-[9px] tracking-[0.14em] text-muted hover:border-danger/40 hover:text-danger disabled:opacity-40"
                  >
                    DROP
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {closed.length > 0 ? (
        <div className="border-t border-line px-4 py-2">
          <p className="text-[9px] tracking-[0.14em] text-muted/60">CLOSED · {closed.length}</p>
          <ul className="mt-1 space-y-0.5">
            {closed.slice(0, 6).map((lane) => (
              <li key={lane.id} className="flex items-center gap-2 text-[10px] text-muted/70">
                <span
                  className="size-1 shrink-0"
                  style={{ background: AGENT_META[lane.status].color }}
                />
                <span className="min-w-0 flex-1 truncate">{lane.title}</span>
                <span className="tabular-nums">
                  {lane.status === "MERGED" ? `+${lane.xp}` : lane.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {toast ? (
        <motion.div
          className="border-t border-line px-4 py-1.5 text-[10px] text-ok"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {toast}
        </motion.div>
      ) : null}
    </div>
  );
}
