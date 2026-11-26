import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { localMinutes, prettyDate, localDateKey } from "@/lib/day";
import { getHunter, getOrCreateDay, HUNTER_ID } from "@/lib/day-service";
import { levelFromXp, rankOf, statValue } from "@/lib/xp";
import { StatusBar } from "@/components/status-bar";
import { NowCard } from "@/components/now-card";
import { QuestBoard } from "@/components/quest-board";
import { Timeline } from "@/components/timeline";
import { SystemPanel } from "@/components/system-panel";

export default function Page() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="panel h-[86px] animate-pulse" />
      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <div className="panel h-64 animate-pulse" />
        <div className="panel h-64 animate-pulse" />
      </div>
    </div>
  );
}

async function Dashboard() {
  await connection();

  const minutesNow = localMinutes();
  const [hunter, day] = await Promise.all([getHunter(), getOrCreateDay()]);

  if (!day.checkedInAt) redirect("/checkin");

  const [habits, activeSession] = await Promise.all([
    prisma.habitDef.findMany({
      orderBy: { order: "asc" },
      include: { logs: { where: { dayId: day.id } } },
    }),
    prisma.slotSession.findFirst({
      where: { dayId: day.id, endedAt: null },
      orderBy: { startedAt: "desc" },
    }),
  ]);

  const { level, into, needed } = levelFromXp(hunter.totalXp);
  const current = day.blocks.find((b) => minutesNow >= b.startMin && minutesNow < b.endMin) ?? null;
  const next = day.blocks.find((b) => b.startMin > minutesNow) ?? null;

  const deepWorkMinutes = day.blocks
    .filter((b) => b.type === "DEEP_WORK" || b.type === "LEARNING")
    .reduce((sum, b) => sum + (b.endMin - b.startMin), 0);

  const week = await prisma.dayLog.findMany({
    where: { hunterId: HUNTER_ID },
    orderBy: { date: "desc" },
    take: 7,
    select: { date: true, xpTotal: true, focusMinutes: true, checkedInAt: true },
  });

  return (
    <div className="space-y-4">
      <StatusBar
        handle={hunter.handle}
        level={level}
        rank={rankOf(level)}
        into={into}
        needed={needed}
        streak={hunter.streak}
        xpToday={day.xpTotal}
        focusMin={day.focusMinutes}
        workTarget={day.workTargetMin}
      />

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold tracking-[0.2em] text-fg">STATUS</h1>
          <p className="text-[11px] text-muted">
            {prettyDate(day.date.toISOString().slice(0, 10))} · {day.load} load ·{" "}
            {deepWorkMinutes / 60}h scheduled deep work
          </p>
        </div>
        <div className="flex gap-2 text-[10px] tracking-[0.14em]">
          <Link href="/checkin" className="border border-line px-2 py-1 text-muted hover:text-fg">
            CHECK-IN
          </Link>
          <Link href="/timetable" className="border border-line px-2 py-1 text-muted hover:text-fg">
            TIMETABLE
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <div className="space-y-4">
          <NowCard
            block={current}
            next={next}
            minutesNow={minutesNow}
            activeSessionId={activeSession?.id ?? null}
            focusTarget={day.focusTarget}
            load={day.load}
          />

          <SystemPanel title="Day timeline" right={`${day.blocks.length} blocks`}>
            <Timeline blocks={day.blocks} minutesNow={minutesNow} compact />
          </SystemPanel>
        </div>

        <div className="space-y-4">
          <SystemPanel
            title="Quests"
            right={`${habits.filter((h) => h.logs.length > 0).length}/${habits.length}`}
          >
            <QuestBoard
              habits={habits.map((h) => ({
                slug: h.slug,
                label: h.label,
                atMin: h.atMin,
                xp: h.xp,
                core: h.core,
                done: h.logs.length > 0,
              }))}
            />
          </SystemPanel>

          <SystemPanel title="Attributes" accent="#8B5CF6">
            <div className="px-4 py-3">
              {hunter.stats.map((s) => {
                const value = statValue(s.xp, s.allocated);
                return (
                  <div key={s.key} className="flex items-center gap-3 py-1">
                    <span className="w-9 text-[10px] tracking-[0.14em] text-muted">{s.key}</span>
                    <div className="h-1 flex-1 bg-line/70">
                      <div
                        className="h-full bg-shadow"
                        style={{ width: `${Math.min(100, (value / 40) * 100)}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-[11px] tabular-nums text-fg">{value}</span>
                  </div>
                );
              })}
              <p className="mt-2 text-[10px] text-muted">
                {hunter.freePoints} free points · fed by real work, not manual edits
              </p>
            </div>
          </SystemPanel>

          <SystemPanel title="Last 7 days">
            <div className="flex items-end gap-1.5 px-4 py-3">
              {[...week].reverse().map((d) => {
                const height = Math.max(4, Math.min(48, Math.round(d.xpTotal / 12)));
                return (
                  <div key={d.date.toISOString()} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full"
                      style={{
                        height,
                        background: d.checkedInAt ? "#4DA3FF55" : "#FF3B4E33",
                      }}
                      title={`${d.date.toISOString().slice(0, 10)} · ${d.xpTotal} xp`}
                    />
                    <span className="text-[8px] text-muted">
                      {d.date.toISOString().slice(8, 10)}
                    </span>
                  </div>
                );
              })}
              {week.length === 0 ? (
                <p className="text-[11px] text-muted">Day 1. Nothing logged yet.</p>
              ) : null}
            </div>
            <div className="border-t border-line px-4 py-2 text-[10px] text-muted">
              today {localDateKey()} · n={week.length}
            </div>
          </SystemPanel>
        </div>
      </div>
    </div>
  );
}
