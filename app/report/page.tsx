import { Suspense } from "react";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { localDateKey, prettyDate } from "@/lib/day";
import { SystemPanel } from "@/components/system-panel";
import { ApplicationList, type ApplicationRow } from "@/components/application-list";
import { readiness, readinessBand, STAGE_META, STAGE_ORDER } from "@/lib/readiness";
import { PATTERN_LABEL } from "@/lib/dsa";
import type { Pattern } from "@/lib/generated/prisma/client";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="panel h-72 animate-pulse" />
          <div className="panel h-72 animate-pulse" />
        </div>
      }
    >
      <Report />
    </Suspense>
  );
}

const COHORT_MIN = 60;

async function Report() {
  await connection();

  const [problems, applications, submittedProjects, appCount, cohortSessions] = await Promise.all([
    prisma.problem.findMany({
      select: { pattern: true, difficulty: true, solvedAt: true },
    }),
    prisma.application.findMany({
      orderBy: { appliedAt: "desc" },
      take: 40,
    }),
    prisma.project.count({ where: { phase: "SUBMITTED" } }),
    prisma.application.count(),
    prisma.slotSession.findMany({
      where: { block: { title: { contains: "100x" } } },
      select: { dayId: true, focusMin: true },
    }),
  ]);

  const solved = problems.filter((p) => p.solvedAt !== null);
  const byPattern = new Map<Pattern, number>();
  for (const p of solved) byPattern.set(p.pattern, (byPattern.get(p.pattern) ?? 0) + 1);
  const patternsCovered = [...byPattern.values()].filter((n) => n >= 3).length;

  const cohortByDay = new Map<string, number>();
  for (const s of cohortSessions) {
    cohortByDay.set(s.dayId, (cohortByDay.get(s.dayId) ?? 0) + s.focusMin);
  }
  const cohortDays = [...cohortByDay.values()].filter((m) => m >= COHORT_MIN).length;

  const result = readiness({
    problems: solved.length,
    patterns: patternsCovered,
    cohort: cohortDays,
    projects: submittedProjects,
    applications: appCount,
  });
  const band = readinessBand(result.score);

  const byDifficulty = { EASY: 0, MEDIUM: 0, HARD: 0 };
  for (const p of solved) byDifficulty[p.difficulty] += 1;

  const stageCounts = Object.fromEntries(STAGE_ORDER.map((s) => [s, 0])) as Record<
    (typeof STAGE_ORDER)[number],
    number
  >;
  for (const app of applications) stageCounts[app.stage] += 1;
  const funnelTotal = Math.max(1, appCount);

  const weakPatterns = [...byPattern.entries()]
    .filter(([, n]) => n < 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const rows: ApplicationRow[] = applications.map((a) => ({
    id: a.id,
    company: a.company,
    role: a.role,
    stage: a.stage,
    appliedAt: a.appliedAt.toISOString().slice(0, 10),
    url: a.url,
  }));

  const ring = 2 * Math.PI * 54;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-[0.2em] text-fg">REPORT</h1>
        <p className="text-[11px] text-muted">
          {prettyDate(localDateKey())} · readiness is derived from stored rows, never typed in
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <SystemPanel title="SDE-1 readiness" right={band.label}>
          <div className="grid place-items-center px-4 py-5">
            <div className="relative">
              <svg viewBox="0 0 128 128" className="size-40 -rotate-90">
                <circle cx="64" cy="64" r="54" fill="none" stroke="#1E2733" strokeWidth="6" />
                <circle
                  cx="64"
                  cy="64"
                  r="54"
                  fill="none"
                  stroke={band.color}
                  strokeWidth="6"
                  strokeDasharray={ring}
                  strokeDashoffset={ring * (1 - result.score / 100)}
                  strokeLinecap="butt"
                />
              </svg>
              <div className="absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <div className="text-4xl font-semibold tabular-nums text-fg">
                    {result.score}
                  </div>
                  <div className="text-[9px] tracking-[0.18em] text-muted">/ 100</div>
                </div>
              </div>
            </div>
            <p className="mt-3 text-[10px] text-muted">
              problems 40 · patterns 20 · cohort 15 · projects 15 · applications 10
            </p>
          </div>
        </SystemPanel>

        <SystemPanel title="Score breakdown" right={`${result.parts.filter((p) => p.ratio >= 1).length}/5 maxed`}>
          <ul className="divide-y divide-line/40 px-4 py-2">
            {result.parts.map((part) => (
              <li key={part.key} className="py-2">
                <div className="flex items-baseline justify-between gap-2 text-[11px]">
                  <span className="text-fg/85">{part.label}</span>
                  <span className="tabular-nums text-muted">
                    <span className="text-fg">{part.value}</span>/{part.target}
                    <span className="ml-2 text-[10px] text-system/80">+{part.points}</span>
                  </span>
                </div>
                <div className="mt-1 h-1 bg-line/70">
                  <div
                    className="h-full"
                    style={{
                      width: `${Math.round(part.ratio * 100)}%`,
                      background: part.ratio >= 1 ? "#2BD98A" : "#4DA3FF",
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <p className="border-t border-line px-4 py-2 text-[9px] text-muted/60">
            Weakest lever right now:{" "}
            {result.parts.slice().sort((a, b) => a.ratio - b.ratio)[0]?.label.toLowerCase()}.
          </p>
        </SystemPanel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SystemPanel title="Application funnel" right={`${appCount} sent`}>
          <div className="space-y-2 px-4 py-3">
            {(["APPLIED", "OA", "INTERVIEW", "OFFER"] as const).map((stage) => {
              const count = stageCounts[stage];
              return (
                <div key={stage} className="flex items-center gap-2">
                  <span className="w-20 shrink-0 text-[9px] tracking-[0.12em] text-muted">
                    {STAGE_META[stage].label}
                  </span>
                  <div className="h-2 flex-1 bg-line/60">
                    <div
                      className="h-full"
                      style={{
                        width: `${Math.round((count / funnelTotal) * 100)}%`,
                        background: STAGE_META[stage].color,
                      }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right text-[10px] tabular-nums text-fg">
                    {count}
                  </span>
                </div>
              );
            })}
            <div className="flex items-center justify-between border-t border-line pt-2 text-[9px] text-muted/70">
              <span>rejected {stageCounts.REJECTED}</span>
              <span>
                offer rate {appCount === 0 ? "—" : `${Math.round((stageCounts.OFFER / appCount) * 100)}%`}
              </span>
            </div>
            <p className="text-[9px] text-muted/60">
              Stages are current state, not history: moving an application forward pays 120 XP once
              per stage.
            </p>
          </div>
        </SystemPanel>

        <SystemPanel title="DSA coverage" right={`${solved.length} solved`} accent="#4DA3FF">
          <div className="px-4 py-3">
            <div className="grid grid-cols-3 gap-1.5">
              {(["EASY", "MEDIUM", "HARD"] as const).map((d) => (
                <div key={d} className="border border-line px-2 py-1.5">
                  <div className="text-[9px] tracking-[0.12em] text-muted">{d}</div>
                  <div className="text-lg leading-none tabular-nums text-fg">{byDifficulty[d]}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-baseline justify-between text-[10px] text-muted">
              <span>patterns at 3+ problems</span>
              <span className="tabular-nums text-fg">{patternsCovered}/19</span>
            </div>
            {weakPatterns.length > 0 ? (
              <p className="mt-1 text-[10px] text-muted/70">
                Thin:{" "}
                {weakPatterns
                  .map(([p, n]) => `${PATTERN_LABEL[p].toLowerCase()} (${n})`)
                  .join(" · ")}
              </p>
            ) : (
              <p className="mt-1 text-[10px] text-muted/70">Every tagged pattern has 3+ solves.</p>
            )}
            <p className="mt-2 text-[9px] text-muted/60">
              Cohort days: {cohortDays} with 60m+ on a 100x block. Ready at 60.
            </p>
          </div>
        </SystemPanel>
      </div>

      <SystemPanel title="Pipeline" right="40 XP per application">
        <ApplicationList applications={rows} />
      </SystemPanel>
    </div>
  );
}
