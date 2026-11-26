"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { gradeProblem, type GradeResult } from "@/app/actions/problem";
import { LevelUpOverlay } from "@/components/level-up";
import { DIFFICULTY_COLOR, PATTERN_LABEL } from "@/lib/dsa";
import type { Difficulty, Pattern, ReviewGrade } from "@/lib/generated/prisma/client";

export type DueProblem = {
  id: string;
  title: string;
  url: string | null;
  difficulty: Difficulty;
  pattern: Pattern;
  status: string;
  intervalDays: number;
  dueAt: string | null;
};

const GRADES: ReviewGrade[] = ["AGAIN", "HARD", "GOOD", "EASY"];

const GRADE_TONE: Record<ReviewGrade, string> = {
  AGAIN: "border-danger/50 text-danger hover:bg-danger/10",
  HARD: "border-amber/50 text-amber hover:bg-amber/10",
  GOOD: "border-system/50 text-system hover:bg-system/10",
  EASY: "border-ok/50 text-ok hover:bg-ok/10",
};

export function ArenaQueue({ due }: { due: DueProblem[] }) {
  const router = useRouter();
  const [queue, setQueue] = useState(due);
  const [pending, startTransition] = useTransition();
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function grade(problem: DueProblem, grade: ReviewGrade) {
    setQueue((prev) => prev.filter((p) => p.id !== problem.id));
    startTransition(async () => {
      const res: GradeResult = await gradeProblem(problem.id, grade);
      if (!res.ok) {
        setQueue((prev) => [...prev, problem]);
        return;
      }
      setToast(`+${res.awarded} XP · next in ${res.intervalDays}d`);
      window.setTimeout(() => setToast(null), 1600);
      if (res.leveledUp) setLevelUp(res.level);
      router.refresh();
    });
  }

  return (
    <div>
      <LevelUpOverlay level={levelUp} onDone={() => setLevelUp(null)} />

      <div className="flex items-center justify-between border-b border-line px-4 py-2 text-[10px] tracking-[0.14em] text-muted">
        <span>DUE QUEUE</span>
        <span className="tabular-nums">{queue.length} left</span>
      </div>

      {queue.length === 0 ? (
        <p className="px-4 py-4 text-[11px] text-muted">
          Queue clear. Solve something new, then grade it here tomorrow.
        </p>
      ) : (
        <ul className="divide-y divide-line/60">
          {queue.map((problem) => (
            <li key={problem.id} className="px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span
                  className="size-1.5 shrink-0"
                  style={{ background: DIFFICULTY_COLOR[problem.difficulty] }}
                />
                {problem.url ? (
                  <a
                    href={problem.url}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 flex-1 truncate text-xs text-fg hover:text-system"
                  >
                    {problem.title}
                  </a>
                ) : (
                  <span className="min-w-0 flex-1 truncate text-xs text-fg">{problem.title}</span>
                )}
                <span className="shrink-0 text-[9px] tracking-[0.12em] text-muted/60">
                  {PATTERN_LABEL[problem.pattern].toUpperCase()}
                </span>
                <span className="shrink-0 text-[9px] tabular-nums text-muted/60">
                  {problem.intervalDays === 0 ? "NEW" : `${problem.intervalDays}d`}
                </span>
              </div>

              <div className="mt-1.5 flex gap-1.5">
                {GRADES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => grade(problem, g)}
                    disabled={pending}
                    className={`flex-1 border px-2 py-1 text-[9px] tracking-[0.14em] transition-colors disabled:opacity-40 ${GRADE_TONE[g]}`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </li>
          ))}
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
    </div>
  );
}
