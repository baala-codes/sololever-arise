"use client";

import { useActionState, useState } from "react";
import { submitMorningCheckin, type CheckinState } from "@/app/actions/checkin";

const initial: CheckinState = {};

function Scale({
  name,
  label,
  hint,
  defaultValue = 3,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultValue?: number;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="label">{label}</span>
        <span className="text-[10px] tabular-nums text-system">{value}/5</span>
      </div>
      <div className="mt-1.5 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setValue(n)}
            aria-pressed={value === n}
            className={`h-7 flex-1 border text-[11px] tabular-nums transition-colors ${
              value === n
                ? "border-system/60 bg-system/15 text-system"
                : "border-line text-muted hover:border-line2"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <input type="hidden" name={name} value={value} />
      {hint ? <p className="mt-1 text-[10px] text-muted/70">{hint}</p> : null}
    </div>
  );
}

export function CheckinForm({ defaultSleep }: { defaultSleep: number }) {
  const [state, action, pending] = useActionState(submitMorningCheckin, initial);

  return (
    <form action={action} className="space-y-4 px-4 py-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label">Sleep hours</span>
          <input
            name="sleepHours"
            type="number"
            step="0.25"
            min={0}
            max={16}
            defaultValue={defaultSleep}
            required
            className="mt-1 w-full border border-line bg-panel2 px-2 py-1.5 text-sm text-fg outline-none focus:border-system/60"
          />
        </label>
        <label className="block">
          <span className="label">Weight kg (optional)</span>
          <input
            name="weightKg"
            type="number"
            step="0.1"
            placeholder="—"
            className="mt-1 w-full border border-line bg-panel2 px-2 py-1.5 text-sm text-fg outline-none placeholder:text-muted/50 focus:border-system/60"
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Scale name="sleepQuality" label="Sleep quality" />
        <Scale name="energy" label="Energy" />
        <Scale name="mood" label="Mood" />
      </div>

      <label className="block">
        <span className="label">Today&apos;s focus target</span>
        <input
          name="focusTarget"
          required
          minLength={3}
          maxLength={200}
          placeholder="One sentence. The single thing that matters today."
          className="mt-1 w-full border border-line bg-panel2 px-2 py-1.5 text-sm text-fg outline-none placeholder:text-muted/50 focus:border-system/60"
        />
      </label>

      <fieldset>
        <legend className="label">Load</legend>
        <div className="mt-1.5 grid gap-1 sm:grid-cols-3">
          {(
            [
              ["MINIMUM", "6h · streak safe"],
              ["STANDARD", "11h · default"],
              ["SPRINT", "13h+ · deadline"],
            ] as const
          ).map(([value, hint], i) => (
            <label
              key={value}
              className="cursor-pointer border border-line px-2 py-1.5 text-[11px] text-muted transition-colors has-[:checked]:border-system/60 has-[:checked]:bg-system/10 has-[:checked]:text-system"
            >
              <input
                type="radio"
                name="load"
                value={value}
                defaultChecked={i === 1}
                className="sr-only"
              />
              <div className="tracking-[0.14em]">{value}</div>
              <div className="text-[9px] text-muted/70">{hint}</div>
            </label>
          ))}
        </div>
      </fieldset>

      {state.error ? (
        <p className="border border-danger/40 bg-danger/10 px-2 py-1.5 text-[11px] text-danger">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full border border-system/50 bg-system/10 px-4 py-2.5 text-xs tracking-[0.25em] text-system transition-colors hover:bg-system/20 disabled:opacity-50"
      >
        {pending ? "ACCEPTING…" : "ACCEPT DAILY QUEST"}
      </button>
    </form>
  );
}
