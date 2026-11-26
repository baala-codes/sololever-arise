import { Suspense } from "react";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { dateKeyToDbDate, localDateKey, localMinutes, prettyDate } from "@/lib/day";
import { getOrCreateDay } from "@/lib/day-service";
import { addDaysKey } from "@/lib/heat";
import { DayHeatmap } from "@/components/day-heatmap";
import { MonthHeatmap, type HeatDay } from "@/components/month-heatmap";
import { SystemPanel } from "@/components/system-panel";
import { TYPE_COLOR, TYPE_LABEL, type BlockType } from "@/lib/timetable";

export default function Page() {
  return (
    <Suspense fallback={<div className="panel h-96 animate-pulse" />}>
      <Heatmap />
    </Suspense>
  );
}

async function Heatmap() {
  await connection();
  const todayKey = localDateKey();
  const minutes = localMinutes();

  const [day, logs] = await Promise.all([
    getOrCreateDay(),
    prisma.dayLog.findMany({
      where: { date: { gte: dateKeyToDbDate(addDaysKey(todayKey, -89)) } },
      orderBy: { date: "asc" },
      select: {
        date: true,
        focusMinutes: true,
        workTargetMin: true,
        xpTotal: true,
        checkedInAt: true,
      },
    }),
  ]);

  const sessions = await prisma.slotSession.findMany({
    where: { dayId: day.id },
    select: { blockId: true, focusMin: true, targetMin: true },
  });

  const focusByBlock = new Map<string, { focus: number; target: number }>();
  for (const s of sessions) {
    const prev = focusByBlock.get(s.blockId) ?? { focus: 0, target: s.targetMin };
    focusByBlock.set(s.blockId, { focus: prev.focus + s.focusMin, target: s.targetMin });
  }

  const heatDays: HeatDay[] = logs.map((d) => ({
    dateKey: d.date.toISOString().slice(0, 10),
    focusMin: d.focusMinutes,
    targetMin: d.workTargetMin,
    xp: d.xpTotal,
    checkedIn: Boolean(d.checkedInAt),
  }));

  const activeDays = heatDays.filter((d) => d.focusMin > 0);
  const totalFocus = heatDays.reduce((s, d) => s + d.focusMin, 0);
  const atTarget = heatDays.filter((d) => d.targetMin > 0 && d.focusMin >= d.targetMin).length;
  const best = [...heatDays].sort((a, b) => b.focusMin - a.focusMin)[0] ?? null;

  // consecutive days ending today with at least half the target done
  let streak = 0;
  for (let i = 0; i < 90; i++) {
    const key = addDaysKey(todayKey, -i);
    const entry = heatDays.find((d) => d.dateKey === key);
    if (entry && entry.targetMin > 0 && entry.focusMin >= entry.targetMin / 2) streak++;
    else if (i > 0) break;
  }

  const perType = new Map<BlockType, { planned: number; done: number }>();
  for (const b of day.blocks) {
    const entry = perType.get(b.type) ?? { planned: 0, done: 0 };
    const duration = b.endMin - b.startMin;
    entry.planned += duration;
    if (b.doneAt) entry.done += duration;
    perType.set(b.type, entry);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-[0.2em] text-fg">HEATMAP</h1>
        <p className="text-[11px] text-muted">
          {prettyDate(todayKey)} · every block in its own colour · intensity is real focus, not intent
        </p>
      </div>

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        <Stat label="Focus · 90d" value={`${Math.round(totalFocus / 60)}h`} hint={`${activeDays.length} active days`} />
        <Stat label="Days at target" value={`${atTarget}`} hint={`of ${heatDays.length} logged`} />
        <Stat
          label="Best day"
          value={best ? `${Math.round(best.focusMin / 60)}h` : "—"}
          hint={best ? best.dateKey.slice(5) : "no data"}
        />
        <Stat label="Half-target streak" value={`${streak}d`} hint="today counts" />
      </div>

      <SystemPanel title="Today · blocks by colour" right={day.load} accent="#4DA3FF">
        <DayHeatmap
          blocks={day.blocks.map((b) => ({
            id: b.id,
            title: b.title,
            startMin: b.startMin,
            endMin: b.endMin,
            type: b.type,
            doneAt: b.doneAt,
          }))}
          minutesNow={minutes}
        />
        <div className="grid gap-x-4 gap-y-1 border-t border-line px-4 py-2 sm:grid-cols-2">
          {day.blocks
            .filter((b) => b.slotProfile !== "NONE")
            .map((b) => {
              const got = focusByBlock.get(b.id)?.focus ?? 0;
              const target = b.endMin - b.startMin;
              const ratio = Math.min(1, got / target);
              return (
                <div key={b.id} className="flex items-center gap-2 py-0.5 text-[10px]">
                  <span className="size-1.5 shrink-0" style={{ background: TYPE_COLOR[b.type] }} />
                  <span className="w-36 shrink-0 truncate text-muted">{b.title}</span>
                  <div className="h-1 flex-1 bg-line/60">
                    <div
                      className="h-full"
                      style={{
                        width: `${ratio * 100}%`,
                        background: ratio >= 1 ? "#2BD98A" : TYPE_COLOR[b.type],
                      }}
                    />
                  </div>
                  <span className="w-12 shrink-0 text-right tabular-nums text-muted/70">
                    {got}/{target}m
                  </span>
                </div>
              );
            })}
        </div>
      </SystemPanel>

      <SystemPanel title="12 weeks · focus intensity" right="last 12 weeks">
        <MonthHeatmap days={heatDays} todayKey={todayKey} />
      </SystemPanel>

      <SystemPanel title="Cleared by category" accent="#2BD98A">
        <ul className="divide-y divide-line/60">
          {[...perType.entries()]
            .sort((a, b) => b[1].planned - a[1].planned)
            .map(([type, v]) => {
              const ratio = v.planned > 0 ? v.done / v.planned : 0;
              return (
                <li key={type} className="flex items-center gap-3 px-4 py-2 text-[11px]">
                  <span className="size-1.5 shrink-0" style={{ background: TYPE_COLOR[type] }} />
                  <span className="w-24 shrink-0 tracking-[0.12em] text-muted">
                    {TYPE_LABEL[type].toUpperCase()}
                  </span>
                  <div className="h-1.5 flex-1 bg-line/60">
                    <div
                      className="h-full transition-[width]"
                      style={{ width: `${ratio * 100}%`, background: TYPE_COLOR[type] }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right tabular-nums text-muted">
                    {Math.round(v.done / 60)}h / {Math.round(v.planned / 60)}h
                  </span>
                </li>
              );
            })}
        </ul>
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
