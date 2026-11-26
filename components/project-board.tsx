"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  addChecklistItem,
  createProject,
  deleteProject,
  removeChecklistItem,
  setPhase,
  submitProject,
  toggleChecklistItem,
} from "@/app/actions/warroom";
import { LevelUpOverlay } from "@/components/level-up";
import { PHASE_META, countdownLabel } from "@/lib/warroom";
import type { ProjectPhase } from "@/lib/generated/prisma/client";

export type ProjectView = {
  id: string;
  name: string;
  phase: ProjectPhase;
  daysLeft: number | null;
  repoUrl: string | null;
  items: { id: string; label: string; done: boolean }[];
};

const SELECTABLE: ProjectPhase[] = ["IDEA", "BUILD", "POLISH"];

export function ProjectBoard({ projects }: { projects: ProjectView[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [deadline, setDeadline] = useState("");
  const [repo, setRepo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 1800);
  }

  function run(fn: () => Promise<{ ok: boolean; error?: string; awarded?: number; leveledUp?: boolean; level?: number }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(res.error ?? "That did not work.");
        return;
      }
      if (res.awarded) flash(`+${res.awarded} XP`);
      if (res.leveledUp && res.level !== undefined) setLevelUp(res.level);
      router.refresh();
    });
  }

  return (
    <div>
      <LevelUpOverlay level={levelUp} onDone={() => setLevelUp(null)} />

      <div className="flex items-center justify-between border-b border-line px-4 py-2 text-[10px] tracking-[0.14em] text-muted">
        <span>PROJECTS</span>
        <span className="tabular-nums">
          {projects.filter((p) => p.phase === "SUBMITTED").length}/{projects.length} submitted
        </span>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          const n = name;
          const d = deadline;
          const r = repo;
          setName("");
          setDeadline("");
          setRepo("");
          run(() => createProject(n, d || null, r));
        }}
        className="space-y-2 border-b border-line px-4 py-3"
      >
        <div className="flex gap-1.5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="hackathon / side project name"
            maxLength={120}
            className="min-w-0 flex-1 border border-line bg-panel2 px-2 py-1.5 text-xs text-fg placeholder:text-muted/50 focus:border-system/60 focus:outline-none"
          />
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="shrink-0 border border-line bg-panel2 px-2 py-1 text-[11px] text-muted focus:border-line2 focus:outline-none"
          />
          <button
            type="submit"
            disabled={pending || !name.trim()}
            className="shrink-0 border border-system/50 bg-system/10 px-3 py-1.5 text-[10px] tracking-[0.14em] text-system transition-colors hover:bg-system/20 disabled:opacity-40"
          >
            ADD
          </button>
        </div>
        <input
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
          placeholder="repo url (optional)"
          className="w-full border border-line bg-panel2 px-2 py-1 text-[11px] text-fg placeholder:text-muted/50 focus:border-line2 focus:outline-none"
        />
        {error ? <p className="text-[10px] text-danger">{error}</p> : null}
      </form>

      {projects.length === 0 ? (
        <p className="px-4 py-4 text-[11px] text-muted">
          No projects. A hackathon with a deadline and a checklist is the only way a submission
          actually happens.
        </p>
      ) : (
        <ul className="divide-y divide-line/60">
          {projects.map((project) => {
            const done = project.items.filter((i) => i.done).length;
            const complete = project.items.length > 0 && done === project.items.length;
            const submitted = project.phase === "SUBMITTED";
            return (
              <li key={project.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-xs text-fg">{project.name}</span>
                  {project.daysLeft !== null ? (
                    <span
                      className={`shrink-0 text-[9px] tracking-[0.12em] tabular-nums ${
                        project.daysLeft <= 1 ? "text-danger" : "text-muted"
                      }`}
                    >
                      {countdownLabel(project.daysLeft)}
                    </span>
                  ) : null}
                  <span
                    className="shrink-0 border px-1.5 py-0.5 text-[8px] tracking-[0.14em]"
                    style={{
                      color: PHASE_META[project.phase].color,
                      borderColor: `${PHASE_META[project.phase].color}66`,
                    }}
                  >
                    {PHASE_META[project.phase].label}
                  </span>
                </div>

                <div className="mt-1.5 flex gap-1">
                  {SELECTABLE.map((phase) => (
                    <button
                      key={phase}
                      type="button"
                      disabled={pending || submitted || project.phase === phase}
                      onClick={() => run(() => setPhase(project.id, phase))}
                      className={`flex-1 border px-1 py-0.5 text-[8px] tracking-[0.12em] transition-colors disabled:opacity-40 ${
                        project.phase === phase
                          ? "border-line2 bg-panel2 text-fg"
                          : "border-line text-muted hover:text-fg"
                      }`}
                    >
                      {PHASE_META[phase].label}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={pending || !complete || submitted}
                    onClick={() => run(() => submitProject(project.id))}
                    title={complete ? "Submit and collect 400 XP" : "Tick every checklist item first"}
                    className="flex-[1.4] border border-ok/50 px-1 py-0.5 text-[8px] tracking-[0.12em] text-ok hover:bg-ok/10 disabled:opacity-30"
                  >
                    {submitted ? "SUBMITTED" : "SUBMIT"}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      if (window.confirm(`Delete ${project.name}?`)) {
                        run(() => deleteProject(project.id));
                      }
                    }}
                    className="border border-line px-1.5 py-0.5 text-[8px] text-muted hover:border-danger/40 hover:text-danger disabled:opacity-40"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-2">
                  <div className="flex items-center justify-between text-[9px] tracking-[0.12em] text-muted/70">
                    <span>SUBMISSION CHECKLIST</span>
                    <span className="tabular-nums">
                      {done}/{project.items.length}
                    </span>
                  </div>
                  <ul className="mt-1 space-y-0.5">
                    {project.items.map((item) => (
                      <li key={item.id} className="group flex items-center gap-2">
                        <button
                          type="button"
                          disabled={pending || submitted}
                          onClick={() => run(() => toggleChecklistItem(item.id))}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left disabled:opacity-60"
                        >
                          <span
                            className={`size-2.5 shrink-0 border ${
                              item.done ? "border-ok bg-ok/30" : "border-line2"
                            }`}
                          />
                          <span
                            className={`min-w-0 truncate text-[11px] ${
                              item.done ? "text-muted line-through" : "text-fg/90"
                            }`}
                          >
                            {item.label}
                          </span>
                        </button>
                        {!submitted ? (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => run(() => removeChecklistItem(item.id))}
                            className="shrink-0 text-[10px] text-muted/40 opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                            aria-label="Remove item"
                          >
                            ✕
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  {!submitted ? <AddItem projectId={project.id} onAdd={run} pending={pending} /> : null}
                  {project.repoUrl ? (
                    <a
                      href={project.repoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block truncate text-[10px] text-system/70 hover:text-system"
                    >
                      {project.repoUrl}
                    </a>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {toast ? (
        <motion.div
          className="border-t border-line px-4 py-1.5 text-[10px] text-ok"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {toast}
        </motion.div>
      ) : null}
      <p className="border-t border-line px-4 py-2 text-[9px] text-muted/60">
        Submission is blocked until every checklist item is ticked. Merged agent lanes count as
        work; abandoned lanes do not.
      </p>
    </div>
  );
}

function AddItem({
  projectId,
  onAdd,
  pending,
}: {
  projectId: string;
  onAdd: (fn: () => Promise<{ ok: boolean; error?: string }>) => void;
  pending: boolean;
}) {
  const [label, setLabel] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!label.trim()) return;
        const value = label;
        setLabel("");
        onAdd(() => addChecklistItem(projectId, value));
      }}
      className="mt-1 flex items-center gap-1"
    >
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="+ add required item (demo link, README, video…)"
        maxLength={160}
        className="min-w-0 flex-1 border-b border-line bg-transparent px-0.5 py-1 text-[10px] text-fg placeholder:text-muted/40 focus:border-line2 focus:outline-none"
      />
      <button
        type="submit"
        disabled={pending || !label.trim()}
        className="shrink-0 px-1 text-[10px] text-muted hover:text-fg disabled:opacity-40"
      >
        ADD
      </button>
    </form>
  );
}
