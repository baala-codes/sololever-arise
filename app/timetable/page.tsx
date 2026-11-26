import { Suspense } from "react";
import { connection } from "next/server";
import { localMinutes, prettyDate, localDateKey } from "@/lib/day";
import { getOrCreateDay } from "@/lib/day-service";
import { setLoad } from "@/app/actions/checkin";
import { SystemPanel } from "@/components/system-panel";
import { Timeline } from "@/components/timeline";
import { minutesToLabel, TYPE_COLOR, TYPE_LABEL, type BlockType } from "@/lib/timetable";

export default function Page() {
  return (
    <Suspense fallback={<div className="panel h-96 animate-pulse" />}>
      <Timetable />
    </Suspense>
  );
}

async function Timetable() {
  await connection();
  const day = await getOrCreateDay();
  const minutes = localMinutes();

  const byType = new Map<BlockType, number>();
  for (const b of day.blocks) {
    byType.set(b.type, (byType.get(b.type) ?? 0) + (b.endMin - b.startMin));
  }

  async function choose(formData: FormData) {
    "use server";
    const load = String(formData.get("load"));
    if (load === "MINIMUM" || load === "STANDARD" || load === "SPRINT") await setLoad(load);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold tracking-[0.2em] text-fg">TIMETABLE</h1>
          <p className="text-[11px] text-muted">
            {prettyDate(localDateKey())} · it is {minutesToLabel(minutes)} · {day.load} load
          </p>
        </div>
        <form action={choose} className="flex gap-1">
          {(["MINIMUM", "STANDARD", "SPRINT"] as const).map((load) => (
            <button
              key={load}
              type="submit"
              name="load"
              value={load}
              className={`border px-2 py-1 text-[10px] tracking-[0.14em] transition-colors ${
                day.load === load
                  ? "border-system/60 bg-system/10 text-system"
                  : "border-line text-muted hover:border-line2 hover:text-fg"
              }`}
            >
              {load}
            </button>
          ))}
        </form>
      </div>

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {[...byType.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([type, mins]) => (
            <div key={type} className="panel px-3 py-2">
              <div className="flex items-center gap-1.5">
                <span className="size-1.5" style={{ background: TYPE_COLOR[type] }} />
                <span className="text-[9px] tracking-[0.16em] text-muted">
                  {TYPE_LABEL[type].toUpperCase()}
                </span>
              </div>
              <div className="mt-1 text-sm tabular-nums text-fg">
                {Math.floor(mins / 60)}h{" "}
                <span className="text-[10px] text-muted">{mins % 60 ? `${mins % 60}m` : ""}</span>
              </div>
            </div>
          ))}
      </div>

      <SystemPanel
        title="Day plan"
        right={`${day.workTargetMin / 60}h work target`}
        accent="#4DA3FF"
      >
        <Timeline blocks={day.blocks} minutesNow={minutes} />
      </SystemPanel>

      <p className="px-1 text-[10px] leading-relaxed text-muted">
        Blocks are materialized per day from the canonical template, so edits and one-offs never
        rewrite history. Slot debt accrues when a day closes under target (cap 6h) and is spent on
        SPRINT days.
      </p>
    </div>
  );
}
