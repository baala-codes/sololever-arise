"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { play } from "@/lib/sound";

export function LevelUpOverlay({ level, onDone }: { level: number | null; onDone: () => void }) {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (level === null) return;
    play("levelUp");
    const t = window.setTimeout(onDone, reduce ? 700 : 1900);
    return () => window.clearTimeout(t);
  }, [level, onDone, reduce]);

  return (
    <AnimatePresence>
      {level !== null ? (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-bg/70 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDone}
          role="alertdialog"
          aria-label={`Level up. Level ${level}.`}
        >
          <motion.div
            className="relative text-center"
            initial={reduce ? { opacity: 0 } : { scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
          >
            {!reduce ? (
              <motion.div
                className="absolute inset-0 -z-10 border border-system/40"
                initial={{ scale: 0.6, opacity: 0.9 }}
                animate={{ scale: 2.4, opacity: 0 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
            ) : null}
            <div className="label mb-2 text-system">[ SYSTEM ]</div>
            <div className="text-xs tracking-[0.35em] text-muted">LEVEL UP</div>
            <motion.div
              className="mt-2 text-7xl font-bold tabular-nums text-fg"
              initial={reduce ? undefined : { y: 12 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              {String(level).padStart(2, "0")}
            </motion.div>
            <div className="mt-3 text-[11px] tracking-[0.2em] text-ok">+3 STAT POINTS</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
