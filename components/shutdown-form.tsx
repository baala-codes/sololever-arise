"use client";

import { useActionState } from "react";
import { submitShutdown, type CheckinState } from "@/app/actions/checkin";

const initial: CheckinState = {};

export function ShutdownForm() {
  const [state, action, pending] = useActionState(submitShutdown, initial);

  return (
    <form action={action} className="space-y-3 px-4 py-4">
      <p className="text-[11px] text-muted">
        Three minutes, no essay. These become tomorrow&apos;s quest board.
      </p>
      {(["top1", "top2", "top3"] as const).map((name, i) => (
        <label key={name} className="flex items-center gap-2">
          <span className="w-4 text-[10px] tabular-nums text-muted">{i + 1}.</span>
          <input
            name={name}
            placeholder={i === 0 ? "The one thing that must happen" : "Supporting task"}
            className="w-full border border-line bg-panel2 px-2 py-1.5 text-xs text-fg outline-none placeholder:text-muted/50 focus:border-system/60"
          />
        </label>
      ))}
      <label className="block">
        <span className="label">One line — what actually happened</span>
        <textarea
          name="journal"
          rows={2}
          className="mt-1 w-full resize-none border border-line bg-panel2 px-2 py-1.5 text-xs text-fg outline-none focus:border-system/60"
        />
      </label>
      {state.error ? (
        <p className="border border-danger/40 bg-danger/10 px-2 py-1.5 text-[11px] text-danger">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full border border-ok/50 bg-ok/10 px-4 py-2 text-xs tracking-[0.25em] text-ok transition-colors hover:bg-ok/20 disabled:opacity-50"
      >
        {pending ? "CLOSING…" : "CLOSE THE DAY · +60 XP"}
      </button>
    </form>
  );
}
