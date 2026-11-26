import { Suspense } from "react";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { localDateKey } from "@/lib/day";
import { deleteProblem, nudgeDue } from "@/app/actions/problem";
import { ArenaAdd } from "@/components/arena-add";
import { ArenaQueue, type DueProblem } from "@/components/arena-queue";
import { SystemPanel } from "@/components/system-panel";
import {
  DIFFICULTY_COLOR,
  PATTERN_LABEL,
  PATTERN_TARGET,
  STATUS_COLOR,
} from "@/lib/dsa";
import type { Pattern } from "@/lib/generated/prisma/client";

export default function Page() {
  return (
    <Suspense fallback={<div className="panel h-96 animate-pulse" />}>
      <Arena />
    </Suspense>
  );
}

async function Arena() {
  await connection();
  const todayKey = localDateKey();
  const today = new Date(`${todayKey}T00:00:00.000Z`);
  const weekAgo = new Date(today.getTime() - 6 * 86_400_000);

  const [problems, recentReviews] = await Promise.all([
    prisma.problem.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }] }),
    prisma.review.findMany({
      where: { at: { gte: weekAgo } },
      select: { grade: true, problemId: true },
    }),
  ]);

  const due: DueProblem[] = problems
    .filter((p) => p.status !== "TODO" && p.dueAt !== null && p.dueAt <= today)
    .map((p) => ({
      id: p.id,
      title: p.title,
      url: p.url,
      difficulty: p.difficulty,
      pattern: p.pattern,
      status: p.status,
      intervalDays: p.intervalDays,
      dueAt: p.dueAt ? p.dueAt.toISOString().slice(0, 10) : null,
    }));

  const solved = problems.filter((p) => p.status !== "TODO");

  const byPattern = new Map<Pattern, number>();
  for (const p of solved) byPattern.set(p.pattern, (byPattern.get(p.pattern) ?? 0) + 1);
  const covered = [...byPattern.values()].filter((n) => n >= PATTERN_TARGET).length;

  const weekSolves = recentReviews.filter((r) => r.grade !== "AGAIN").length;
  const weak = recentReviews.filter((r) => r.grade === "AGAIN").length;

  const rows = [...problems].sort((a, b) => {
    const rank = (s: string) => (s === "TODO" ? 2 : s === "REVISIT" ? 0 : 1);
    const diff = rank(a.status) - rank(b.status);
    if (diff !== 0) return diff;
    return (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity);
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-[0.2em] text-fg">ARENA</h1>
        <p className="text-[11px] text-muted">
          {solved.length}/{problems.length} logged · {due.length} due today · reviews reschedule themselves
        </p>
      </div>

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        <Stat label="Solved" value={`${solved.length}`} hint={`${problems.length - solved.length} unsolved`} />
        <Stat label="Due now" value={`${due.length}`} hint={due.length === 0 ? "queue clear" : "grade to reschedule"} />
        <Stat label="Recalls · 7d" value={`${weekSolves}`} hint={`${weak} misses`} />
        <Stat label="Patterns armed" value={`${covered}/${Object.keys(PATTERN_LABEL).length}`} hint={`${PATTERN_TARGET}+ each`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <SystemPanel title="Due queue" right={`${due.length}`} accent="#E8A33D">
          <ArenaQueue due={due} />
        </SystemPanel>

        <SystemPanel title="Log a problem" accent="#4DA3FF">
          <ArenaAdd />
        </SystemPanel>
      </div>

      <SystemPanel title="Pattern coverage" right={`${PATTERN_TARGET} per pattern`}>
        <div className="grid gap-x-4 gap-y-1.5 px-4 py-3 sm:grid-cols-2">
          {(Object.keys(PATTERN_LABEL) as Pattern[]).map((pattern) => {
            const n = byPattern.get(pattern) ?? 0;
            const ratio = Math.min(1, n / PATTERN_TARGET);
            return (
              <div key={pattern} className="flex items-center gap-2 text-[10px]">
                <span className="w-24 shrink-0 truncate text-muted">{PATTERN_LABEL[pattern]}</span>
                <div className="h-1.5 flex-1 bg-line/60">
                  <div
                    className="h-full"
                    style={{ width: `${ratio * 100}%`, background: ratio >= 1 ? "#2BD98A" : "#4DA3FF" }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right tabular-nums text-muted/70">
                  {n}/{PATTERN_TARGET}
                </span>
              </div>
            );
          })}
        </div>
      </SystemPanel>

      <SystemPanel title="Problems" right={`${rows.length}`}>
        {rows.length === 0 ? (
          <p className="px-4 py-4 text-[11px] text-muted">Nothing logged yet. Add your first problem above.</p>
        ) : (
          <ul className="divide-y divide-line/60">
            {rows.map((p) => {
              const spend = async (days: number) => {
                "use server";
                await nudgeDue(p.id, days);
              };
              const remove = async () => {
                "use server";
                await deleteProblem(p.id);
              };

              return (
                <li key={p.id} className="flex flex-wrap items-center gap-2 px-4 py-2 text-[11px]">
                  <span
                    className="size-1.5 shrink-0"
                    style={{ background: DIFFICULTY_COLOR[p.difficulty] }}
                  />
                  <span className="min-w-0 flex-1 truncate text-fg/85">{p.title}</span>
                  <span className="w-24 shrink-0 text-[9px] tracking-[0.1em] text-muted/60">
                    {PATTERN_LABEL[p.pattern].toUpperCase()}
                  </span>
                  <span
                    className="w-16 shrink-0 text-[9px] tracking-[0.1em]"
                    style={{ color: STATUS_COLOR[p.status] }}
                  >
                    {p.status}
                  </span>
                  <span className="w-20 shrink-0 text-right tabular-nums text-muted/60">
                    {p.dueAt ? p.dueAt.toISOString().slice(5, 10) : "—"}
                  </span>
                  <span className="w-10 shrink-0 text-right tabular-nums text-muted/50">
                    ×{p.attempts}
                  </span>
                  <span className="flex shrink-0 gap-1">
                    <form action={spend.bind(null, 7)}>
                      <button
                        type="submit"
                        className="border border-line px-1.5 py-0.5 text-[9px] text-muted hover:border-line2 hover:text-fg"
                      >
                        +7d
                      </button>
                    </form>
                    <form action={remove}>
                      <button
                        type="submit"
                        className="border border-line px-1.5 py-0.5 text-[9px] text-muted/60 hover:border-danger/40 hover:text-danger"
                      >
                        ✕
                      </button>
                    </form>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </SystemPanel>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="panel px-3 py-2">
      <div className="text-[9px] tracking-[0.16em] text-muted">{label.toUpperCase()}</div>
      <div className="mt-1 text-lg leading-none tabular-nums text-fg">{value}</div>
      <div className="mt-1 text-[9px] text-muted/60">{hint}</div>
    </div>
  );
}
