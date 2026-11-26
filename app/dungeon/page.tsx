import { Suspense } from "react";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { localDateKey, prettyDate } from "@/lib/day";
import { getOrCreateDay } from "@/lib/day-service";
import { DungeonBoard, type DungeonWorkout } from "@/components/dungeon-board";
import { SystemPanel } from "@/components/system-panel";
import { SPLIT_META, prescription, unitLabel } from "@/lib/workout";

export default function Page() {
  return (
    <Suspense fallback={<div className="panel h-96 animate-pulse" />}>
      <Dungeon />
    </Suspense>
  );
}

async function Dungeon() {
  await connection();
  const day = await getOrCreateDay();

  const [exercises, workouts, recent] = await Promise.all([
    prisma.exercise.findMany({ orderBy: { order: "asc" } }),
    prisma.workout.findMany({
      where: { date: day.date },
      include: { items: { orderBy: [{ position: "asc" }, { setIndex: "asc" }] } },
    }),
    prisma.workout.findMany({
      where: { completedAt: { not: null } },
      orderBy: { date: "desc" },
      take: 10,
      include: { items: { include: { exercise: true } } },
    }),
  ]);

  const toWorkout = (split: "A" | "B"): DungeonWorkout | null => {
    const w = workouts.find((x) => x.split === split);
    if (!w) return null;
    return {
      id: w.id,
      completedAt: w.completedAt ? w.completedAt.toISOString() : null,
      xp: w.xp,
      items: w.items.map((i) => ({
        id: i.id,
        exerciseId: i.exerciseId,
        setIndex: i.setIndex,
        value: i.value,
        done: i.doneAt !== null,
      })),
    };
  };

  const weekStart = new Date(day.date.getTime() - 6 * 86_400_000);

  const clearedThisWeek = recent.filter((w) => w.date >= weekStart);

  const pullUpsWeek = recent
    .filter((w) => w.date >= weekStart)
    .flatMap((w) => w.items)
    .filter((i) => i.exercise.slug === "pull-ups" && i.doneAt)
    .reduce((sum, i) => sum + i.value, 0);

  const totalSets = clearedThisWeek.flatMap((w) => w.items).filter((i) => i.doneAt).length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-[0.2em] text-fg">DUNGEON</h1>
        <p className="text-[11px] text-muted">
          {prettyDate(localDateKey())} · two floors a day · targets rise only when a floor is cleared in full
        </p>
      </div>

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        <Stat label="Floors · 7d" value={`${clearedThisWeek.length}`} hint={`${totalSets} sets logged`} />
        <Stat label="Pull-up bank · 7d" value={`${pullUpsWeek}`} hint="grease the groove" />
        <Stat
          label="Push-up target"
          value={`${exercises.find((e) => e.slug === "pushups-normal")?.currentValue ?? 0}`}
          hint="normal · per set"
        />
        <Stat
          label="Skipping target"
          value={`${exercises.find((e) => e.slug === "skips")?.currentValue ?? 0}`}
          hint="per set, 4 sets"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {(["A", "B"] as const).map((split) => (
          <DungeonBoard
            key={split}
            split={split}
            exercises={exercises
              .filter((e) => e.split === split)
              .map((e) => ({
                id: e.id,
                slug: e.slug,
                name: e.name,
                unit: e.unit,
                sets: e.sets,
                currentValue: e.currentValue,
                increment: e.increment,
                cap: e.cap,
              }))}
            workout={toWorkout(split)}
          />
        ))}
      </div>

      <SystemPanel title="Progression" right="auto-scaling" accent="#8B5CF6">
        <div className="grid gap-x-4 gap-y-1 px-4 py-3 sm:grid-cols-2">
          {exercises.map((e) => (
            <div key={e.id} className="flex items-center gap-2 py-0.5 text-[10px]">
              <span className="min-w-0 flex-1 truncate text-muted">{e.name}</span>
              <span className="tabular-nums text-fg">
                {prescription(e.sets, e.currentValue, e.unit)}
              </span>
              <span className="w-12 text-right tabular-nums text-muted/50">
                {e.cap ? `max ${e.cap}${unitLabel(e.unit)}` : `+${e.increment}`}
              </span>
            </div>
          ))}
        </div>
      </SystemPanel>

      <SystemPanel title="Floor log" right={`${recent.length} cleared`}>
        {recent.length === 0 ? (
          <p className="px-4 py-4 text-[11px] text-muted">
            No floors cleared yet. Enter block A and log your first set.
          </p>
        ) : (
          <ul className="divide-y divide-line/60">
            {recent.map((w) => {
              const volume = w.items.filter((i) => i.doneAt).reduce((s, i) => s + i.value, 0);
              return (
                <li key={w.id} className="flex items-center gap-3 px-4 py-2 text-[11px]">
                  <span className="w-16 shrink-0 tabular-nums text-muted">
                    {w.date.toISOString().slice(5, 10)}
                  </span>
                  <span className="w-16 shrink-0 tracking-[0.12em] text-fg/80">
                    {SPLIT_META[w.split].label}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-muted/70">
                    {w.items.filter((i) => i.doneAt).length}/{w.items.length} sets
                  </span>
                  <span className="w-16 shrink-0 text-right tabular-nums text-muted">{volume} vol</span>
                  <span className="w-14 shrink-0 text-right tabular-nums text-ok/80">+{w.xp}</span>
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
