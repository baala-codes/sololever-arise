"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { toggleHabit } from "@/app/actions/habit";
import { minutesToLabel } from "@/lib/timetable";
import { LevelUpOverlay } from "@/components/level-up";

export type HabitItem = {
  slug: string;
  label: string;
  atMin: number | null;
  xp: number;
  core: boolean;
  done: boolean;
};

export function QuestBoard({ habits }: { habits: HabitItem[] }) {
  const [items, setItems] = useState(habits);
  const [pending, startTransition] = useTransition();
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [gain, setGain] = useState<{ slug: string; amount: number } | null>(null);

  const doneCount = items.filter((i) => i.done).length;

  function toggle(slug: string) {
    const current = items.find((i) => i.slug === slug);
    if (!current) return;
    const nextDone = !current.done;

    setItems((prev) => prev.map((i) => (i.slug === slug ? { ...i, done: nextDone } : i)));
    startTransition(async () => {
      const res = await toggleHabit(slug);
      if (nextDone && res.awarded > 0) {
        setGain({ slug, amount: res.awarded });
        window.setTimeout(() => setGain(null), 1200);
      }
      if (res.leveledUp) setLevelUp(res.level);
      if (!res.ok) setItems(habits);
    });
  }

  return (
    <div>
      <LevelUpOverlay level={levelUp} onDone={() => setLevelUp(null)} />
      <div className="flex items-center justify-between border-b border-line px-4 py-2 text-[10px] tracking-[0.14em] text-muted">
        <span>DAILY QUESTS</span>
        <span className="tabular-nums">
          {doneCount}/{items.length}
        </span>
      </div>
      <ul>
        {items.map((habit) => (
          <li key={habit.slug} className="relative border-b border-line/60 last:border-b-0">
            <button
              type="button"
              onClick={() => toggle(habit.slug)}
              disabled={pending}
              className="group flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-system/5 disabled:opacity-70"
            >
              <span
                aria-hidden
                className={`grid size-4 shrink-0 place-items-center border text-[9px] transition-colors ${
                  habit.done
                    ? "border-ok/60 bg-ok/15 text-ok"
                    : "border-line2 text-transparent group-hover:border-muted"
                }`}
              >
                ✓
              </span>
              <span
                className={`min-w-0 flex-1 truncate text-xs ${
                  habit.done ? "text-muted line-through" : "text-fg"
                }`}
              >
                {habit.label}
                {habit.core ? <span className="ml-2 text-[9px] text-danger/80">CORE</span> : null}
              </span>
              <span className="shrink-0 text-[10px] tabular-nums text-muted">
                {habit.atMin !== null ? minutesToLabel(habit.atMin) : "--:--"}
              </span>
              <span className="w-10 shrink-0 text-right text-[10px] tabular-nums text-ok/80">
                +{habit.xp}
              </span>
            </button>
            {gain?.slug === habit.slug ? (
              <motion.span
                className="pointer-events-none absolute top-1 right-14 text-[11px] font-semibold text-ok"
                initial={{ opacity: 1, y: 4 }}
                animate={{ opacity: 0, y: -16 }}
                transition={{ duration: 1.1 }}
              >
                +{gain.amount} XP
              </motion.span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
