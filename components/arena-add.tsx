"use client";

import { useActionState } from "react";
import { addProblem, type ProblemState } from "@/app/actions/problem";
import { PATTERN_LABEL } from "@/lib/dsa";
import type { Pattern } from "@/lib/generated/prisma/client";

const INITIAL: ProblemState = {};
const PATTERNS = Object.keys(PATTERN_LABEL) as Pattern[];

export function ArenaAdd() {
  const [state, action, pending] = useActionState(addProblem, INITIAL);

  return (
    <form action={action} className="px-4 py-3" key={state.slug ?? "empty"}>
      <label className="label block pb-1">Problem</label>
      <input
        name="title"
        required
        placeholder="Longest Substring Without Repeating Characters"
        className="w-full border border-line bg-panel2 px-2 py-1.5 text-xs text-fg outline-none placeholder:text-muted/40 focus:border-system/60"
      />

      <label className="label mt-3 block pb-1">URL (optional)</label>
      <input
        name="url"
        placeholder="https://leetcode.com/problems/…"
        className="w-full border border-line bg-panel2 px-2 py-1.5 text-[11px] text-muted outline-none placeholder:text-muted/40 focus:border-system/60"
      />

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div>
          <label className="label block pb-1">Difficulty</label>
          <select
            name="difficulty"
            defaultValue="MEDIUM"
            className="w-full border border-line bg-panel2 px-2 py-1.5 text-[11px] text-fg outline-none focus:border-system/60"
          >
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </div>
        <div>
          <label className="label block pb-1">Pattern</label>
          <select
            name="pattern"
            defaultValue="ARRAYS"
            className="w-full border border-line bg-panel2 px-2 py-1.5 text-[11px] text-fg outline-none focus:border-system/60"
          >
            {PATTERNS.map((p) => (
              <option key={p} value={p}>
                {PATTERN_LABEL[p]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-3 w-full border border-line px-3 py-2 text-[11px] tracking-[0.2em] text-muted transition-colors hover:border-system/50 hover:text-system disabled:opacity-50"
      >
        {pending ? "LOGGING…" : "ADD PROBLEM"}
      </button>

      {state.error ? <p className="mt-2 text-[10px] text-danger">{state.error}</p> : null}
      {state.ok ? (
        <p className="mt-2 text-[10px] text-ok">Logged. Grade it from the due queue when you solve.</p>
      ) : null}
    </form>
  );
}
