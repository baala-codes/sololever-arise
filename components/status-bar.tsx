"use client";

import { motion } from "framer-motion";

export function StatusBar({
  handle,
  level,
  rank,
  into,
  needed,
  streak,
  xpToday,
  focusMin,
  workTarget,
}: {
  handle: string;
  level: number;
  rank: string;
  into: number;
  needed: number;
  streak: number;
  xpToday: number;
  focusMin: number;
  workTarget: number;
}) {
  const ratio = Math.max(0, Math.min(1, needed > 0 ? into / needed : 0));
  const workRatio = Math.max(0, Math.min(1, workTarget > 0 ? focusMin / workTarget : 0));

  return (
    <div className="panel panel-brackets relative overflow-hidden">
      <div className="flex flex-wrap items-center gap-4 px-4 py-3 md:gap-6 md:px-5">
        <div className="flex items-baseline gap-2">
          <span className="label">LV</span>
          <span className="text-3xl leading-none font-semibold tabular-nums text-fg">
            {String(level).padStart(2, "0")}
          </span>
        </div>

        <div className="flex items-center gap-2 border-l border-line pl-4">
          <span className="label">rank</span>
          <span className="border border-system/40 bg-system/10 px-1.5 py-0.5 text-lg leading-none font-bold text-system">
            {rank}
          </span>
        </div>

        <div className="min-w-[140px] flex-1">
          <div className="flex items-baseline justify-between text-[10px] tracking-[0.14em] text-muted">
            <span>XP</span>
            <span className="tabular-nums">
              {into} / {needed}
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden bg-line/60">
            <motion.div
              className="h-full origin-left bg-system"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: ratio }}
              transition={{ type: "spring", stiffness: 180, damping: 24 }}
              style={{ width: "100%" }}
            />
          </div>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <div className="text-right">
            <div className="label">today</div>
            <div className="tabular-nums text-ok">+{xpToday} xp</div>
          </div>
          <div className="text-right">
            <div className="label">streak</div>
            <div className="tabular-nums text-amber">{streak}d</div>
          </div>
          <div className="text-right">
            <div className="label">focus</div>
            <div className="tabular-nums">
              {focusMin}
              <span className="text-muted">/{workTarget}m</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-line px-4 py-1.5 text-[10px] tracking-[0.14em] text-muted md:px-5">
        <span className="text-system">[ SYSTEM ]</span>
        <span className="truncate">
          {handle.toUpperCase()} — work target {workRatio >= 1 ? "cleared" : `${Math.round(workRatio * 100)}%`}
        </span>
      </div>

      <div className="scanline" aria-hidden />
    </div>
  );
}
