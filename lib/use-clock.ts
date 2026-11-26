"use client";

import { useSyncExternalStore } from "react";

let clockValue = 0;
const listeners = new Set<() => void>();
let timer: number | undefined;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    clockValue = Date.now();
    timer = window.setInterval(() => {
      clockValue = Date.now();
      for (const l of listeners) l();
    }, 250);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== undefined) {
      window.clearInterval(timer);
      timer = undefined;
    }
  };
}

const getSnapshot = () => clockValue;
const getServerSnapshot = () => 0;

/** Shared 250ms clock. Every timer display derives from absolute timestamps, not ticks. */
export function useClock(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
