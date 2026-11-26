"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  adjustExercise,
  completeWorkout,
  resetWorkout,
  startWorkout,
  toggleSet,
} from "@/app/actions/workout";
import { LevelUpOverlay } from "@/components/level-up";
import { SPLIT_META, prescription, unitLabel } from "@/lib/workout";
import type { WorkoutSplit } from "@/lib/generated/prisma/client";

export type DungeonExercise = {
  id: string;
  slug: string;
  name: string;
  unit: "REPS" | "SECONDS";
  sets: number;
  currentValue: number;
  increment: number;
  cap: number | null;
};

export type DungeonItem = {
  id: string;
  exerciseId: string;
  setIndex: number;
  value: number;
  done: boolean;
};

export type DungeonWorkout = {
  id: string;
  completedAt: string | null;
  xp: number;
  items: DungeonItem[];
};

export function DungeonBoard({
  split,
  exercises,
  workout,
}: {
  split: WorkoutSplit;
  exercises: DungeonExercise[];
  workout: DungeonWorkout | null;
}) {
  const meta = SPLIT_META[split];
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState<DungeonItem[]>(workout?.items ?? []);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [gain, setGain] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const doneCount = items.filter((i) => i.done).length;
  const cleared = Boolean(workout?.completedAt);

  function enter() {
    startTransition(async () => {
      const res = await startWorkout(split);
      if (!res.ok) setError("No exercises configured for this split");
      router.refresh();
    });
  }

  function toggle(item: DungeonItem) {
    if (cleared) return;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)),
    );
    startTransition(async () => {
      const res = await toggleSet(item.id);
      if (!res.ok) {
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, done: item.done } : i)));
        return;
      }
      router.refresh();
    });
  }

  function adjust(exerciseId: string, delta: number) {
    if (!workout || cleared) return;
    setItems((prev) =>
      prev.map((i) =>
        i.exerciseId === exerciseId && !i.done ? { ...i, value: Math.max(1, i.value + delta) } : i,
      ),
    );
    startTransition(async () => {
      await adjustExercise(workout.id, exerciseId, delta);
      router.refresh();
    });
  }

  function clear() {
    if (!workout) return;
    startTransition(async () => {
      const res = await completeWorkout(workout.id);
      if (!res.ok) {
        setError("Finish every set before clearing the floor");
        return;
      }
      setError(null);
      setGain(res.awarded);
      if (res.leveledUp) setLevelUp(res.level);
      window.setTimeout(() => setGain(null), 1600);
      router.refresh();
    });
  }

  function reset() {
    if (!workout || cleared) return;
    startTransition(async () => {
      await resetWorkout(workout.id);
      setItems([]);
      router.refresh();
    });
  }

  return (
    <section className="panel panel-brackets" style={{ borderColor: cleared ? "#2BD98A55" : undefined }}>
      <LevelUpOverlay level={levelUp} onDone={() => setLevelUp(null)} />

      <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="size-1.5" style={{ background: cleared ? "#2BD98A" : "#4DA3FF" }} />
          <h2 className="label">{meta.label}</h2>
          <span className="text-[9px] tracking-[0.14em] text-muted/60">{meta.focus.toUpperCase()}</span>
        </div>
        <span className="text-[10px] tabular-nums text-muted">
          {workout ? `${doneCount}/${items.length} sets` : `${exercises.length} exercises`}
        </span>
      </header>

      {!workout ? (
        <>
          <ul className="divide-y divide-line/50">
            {exercises.map((exercise) => (
              <li key={exercise.id} className="flex items-center gap-3 px-4 py-2">
                <span className="min-w-0 flex-1 truncate text-xs text-fg/85">{exercise.name}</span>
                <span className="shrink-0 text-[11px] tabular-nums text-muted">
                  {prescription(exercise.sets, exercise.currentValue, exercise.unit)}
                </span>
                <span className="w-10 shrink-0 text-right text-[9px] tabular-nums text-ok/70">
                  +{exercise.increment}
                  {unitLabel(exercise.unit)}
                </span>
              </li>
            ))}
          </ul>
          <div className="border-t border-line px-3 py-2">
            <button
              type="button"
              onClick={enter}
              disabled={pending}
              className="w-full border border-line px-3 py-2 text-[11px] tracking-[0.2em] text-muted transition-colors hover:border-system/50 hover:text-system disabled:opacity-50"
            >
              {pending ? "OPENING…" : "ENTER FLOOR"}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="divide-y divide-line/50">
            {exercises.map((exercise) => {
              const sets = items
                .filter((i) => i.exerciseId === exercise.id)
                .sort((a, b) => a.setIndex - b.setIndex);
              if (sets.length === 0) return null;
              return (
                <div key={exercise.id} className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-xs text-fg/85">{exercise.name}</span>
                    <span className="text-[9px] tabular-nums text-muted/60">
                      target {prescription(sets.length, sets[0].value, exercise.unit)}
                    </span>
                    {!cleared ? (
                      <span className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => adjust(exercise.id, -Math.max(1, Math.round(exercise.increment / 2)))}
                          disabled={pending}
                          className="size-5 border border-line text-[10px] text-muted hover:border-line2 hover:text-fg disabled:opacity-40"
                          aria-label={`decrease ${exercise.name}`}
                        >
                          −
                        </button>
                        <button
                          type="button"
                          onClick={() => adjust(exercise.id, Math.max(1, Math.round(exercise.increment / 2)))}
                          disabled={pending}
                          className="size-5 border border-line text-[10px] text-muted hover:border-line2 hover:text-fg disabled:opacity-40"
                          aria-label={`increase ${exercise.name}`}
                        >
                          +
                        </button>
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {sets.map((set) => (
                      <button
                        key={set.id}
                        type="button"
                        onClick={() => toggle(set)}
                        disabled={pending || cleared}
                        className={`border px-2 py-1 text-[10px] tabular-nums transition-colors ${
                          set.done
                            ? "border-ok/60 bg-ok/15 text-ok"
                            : "border-line text-muted hover:border-system/50 hover:text-system"
                        } disabled:opacity-80`}
                      >
                        {set.value}
                        {unitLabel(exercise.unit)}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 border-t border-line px-3 py-2">
            {cleared ? (
              <>
                <span className="text-[10px] tracking-[0.16em] text-ok">FLOOR CLEARED</span>
                <span className="ml-auto text-[10px] tabular-nums text-ok/80">+{workout.xp} XP</span>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={reset}
                  disabled={pending}
                  className="border border-line px-2 py-1.5 text-[9px] tracking-[0.14em] text-muted/70 hover:border-danger/40 hover:text-danger disabled:opacity-40"
                >
                  DISCARD
                </button>
                <button
                  type="button"
                  onClick={clear}
                  disabled={pending || doneCount !== items.length}
                  className="ml-auto border border-system/50 bg-system/10 px-3 py-1.5 text-[10px] tracking-[0.18em] text-system transition-colors hover:bg-system/20 disabled:border-line disabled:bg-transparent disabled:text-muted/40"
                >
                  {doneCount === items.length ? "CLEAR FLOOR" : `${items.length - doneCount} SETS LEFT`}
                </button>
              </>
            )}
            {gain !== null ? (
              <motion.span
                className="ml-2 text-[11px] font-semibold text-ok"
                initial={{ opacity: 1, y: 4 }}
                animate={{ opacity: 0, y: -14 }}
                transition={{ duration: 1.4 }}
              >
                +{gain} XP
              </motion.span>
            ) : null}
          </div>
        </>
      )}

      {error ? (
        <p className="border-t border-danger/30 bg-danger/5 px-4 py-1.5 text-[10px] text-danger">{error}</p>
      ) : null}
    </section>
  );
}
