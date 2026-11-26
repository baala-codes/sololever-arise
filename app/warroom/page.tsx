import { Suspense } from "react";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { localDateKey, prettyDate } from "@/lib/day";
import { getOrCreateDay } from "@/lib/day-service";
import { LaneBoard, type Lane } from "@/components/lane-board";
import { ProjectBoard, type ProjectView } from "@/components/project-board";
import { SystemPanel } from "@/components/system-panel";
import { AGENT_META, countdownLabel, daysBetween } from "@/lib/warroom";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="panel h-96 animate-pulse" />
          <div className="panel h-96 animate-pulse" />
        </div>
      }
    >
      <WarRoom />
    </Suspense>
  );
}

async function WarRoom() {
  await connection();
  const day = await getOrCreateDay();

  const [agents, projects] = await Promise.all([
    prisma.agent.findMany({
      orderBy: { dispatchedAt: "desc" },
      take: 30,
      include: { project: { select: { name: true } } },
    }),
    prisma.project.findMany({
      orderBy: [{ phase: "asc" }, { deadline: "asc" }, { createdAt: "desc" }],
      include: { checklist: { orderBy: { order: "asc" } } },
    }),
  ]);

  const lanes: Lane[] = agents.map((a) => ({
    id: a.id,
    title: a.title,
    note: a.note,
    status: a.status,
    needsMe: a.needsMe,
    project: a.project?.name ?? null,
    xp: a.xp,
  }));

  const views: ProjectView[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
    phase: p.phase,
    daysLeft: p.deadline ? daysBetween(day.date, p.deadline) : null,
    repoUrl: p.repoUrl,
    items: p.checklist.map((i) => ({ id: i.id, label: i.label, done: i.doneAt !== null })),
  }));

  const upcoming = views
    .filter((p) => p.phase !== "SUBMITTED" && p.daysLeft !== null)
    .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));
  const nextDeadline = upcoming[0] ?? null;

  const activeLanes = lanes.filter(
    (l) => l.status === "DISPATCHED" || l.status === "RUNNING" || l.status === "REVIEW",
  );
  const merged = lanes.filter((l) => l.status === "MERGED");
  const agentXp = merged.reduce((sum, l) => sum + l.xp, 0);
  const awaiting = activeLanes.filter((l) => l.needsMe).length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-[0.2em] text-fg">WAR ROOM</h1>
        <p className="text-[11px] text-muted">
          {prettyDate(localDateKey())} · dispatch work you do not have to babysit · merge only what
          you reviewed
        </p>
      </div>

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        <Stat
          label="Next deadline"
          value={nextDeadline ? `${nextDeadline.daysLeft}d` : "—"}
          hint={nextDeadline ? nextDeadline.name : "no project deadline"}
          tone={nextDeadline && (nextDeadline.daysLeft ?? 0) <= 1 ? "danger" : undefined}
        />
        <Stat label="Open lanes" value={`${activeLanes.length}`} hint={`${awaiting} need you`} />
        <Stat label="Merged" value={`${merged.length}`} hint={`${agentXp} XP from agents`} />
        <Stat
          label="Submitted"
          value={`${views.filter((p) => p.phase === "SUBMITTED").length}`}
          hint="400 XP each"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.15fr]">
        <div className="space-y-4">
          <SystemPanel title="Lanes" right="violet" accent="#8B5CF6">
            <LaneBoard
              lanes={lanes}
              projects={projects
                .filter((p) => p.phase !== "SUBMITTED")
                .map((p) => ({ id: p.id, name: p.name }))}
            />
          </SystemPanel>

          <SystemPanel title="Lane states" right="chain" accent="#8B5CF6">
            <ul className="space-y-1 px-4 py-3">
              {(Object.keys(AGENT_META) as (keyof typeof AGENT_META)[]).map((key) => (
                <li key={key} className="flex items-center gap-2 text-[10px]">
                  <span className="size-1.5 shrink-0" style={{ background: AGENT_META[key].color }} />
                  <span className="w-24 shrink-0 tracking-[0.12em] text-fg/80">{AGENT_META[key].label}</span>
                  <span className="min-w-0 flex-1 truncate text-muted/70">{AGENT_META[key].hint}</span>
                </li>
              ))}
            </ul>
          </SystemPanel>
        </div>

        <SystemPanel title="Projects" right="checklist gate">
          <ProjectBoard projects={views} />
        </SystemPanel>
      </div>

      {nextDeadline ? (
        <p className="text-[10px] text-muted/60">
          Nearest deadline: {nextDeadline.name} · {countdownLabel(nextDeadline.daysLeft ?? 0)}.
          Submission pays 400 XP and only counts with a full checklist.
        </p>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "danger";
}) {
  return (
    <div className="panel px-3 py-2">
      <div className="text-[9px] tracking-[0.16em] text-muted">{label.toUpperCase()}</div>
      <div
        className={`mt-1 text-lg leading-none tabular-nums ${tone === "danger" ? "text-danger" : "text-fg"}`}
      >
        {value}
      </div>
      <div className="mt-1 truncate text-[9px] text-muted/60">{hint}</div>
    </div>
  );
}
