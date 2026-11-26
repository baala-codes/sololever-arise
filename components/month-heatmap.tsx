import { HEAT_RAMP, addDaysKey, heatColor, heatLabel, weekdayIndex } from "@/lib/heat";

export type HeatDay = {
  dateKey: string;
  focusMin: number;
  targetMin: number;
  xp: number;
  checkedIn: boolean;
};

const WEEKS = 12;
const CELL = 13;
const GAP = 3;

/** 12 weeks of focus intensity. Each column is a week, Monday at the top. */
export function MonthHeatmap({ days, todayKey }: { days: HeatDay[]; todayKey: string }) {
  const byKey = new Map(days.map((d) => [d.dateKey, d]));
  const todayWeekday = weekdayIndex(todayKey);
  const startKey = addDaysKey(todayKey, -(todayWeekday + (WEEKS - 1) * 7));

  const columns = Array.from({ length: WEEKS }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDaysKey(startKey, w * 7 + d)),
  );

  const monthLabels: { col: number; label: string }[] = [];
  columns.forEach((col, i) => {
    const first = col[0];
    const prev = i > 0 ? columns[i - 1][0] : null;
    const month = new Date(`${first}T00:00:00.000Z`).toLocaleDateString("en-GB", {
      month: "short",
      timeZone: "UTC",
    });
    const prevMonth = prev
      ? new Date(`${prev}T00:00:00.000Z`).toLocaleDateString("en-GB", {
          month: "short",
          timeZone: "UTC",
        })
      : null;
    if (month !== prevMonth) monthLabels.push({ col: i, label: month });
  });

  return (
    <div className="px-4 py-3">
      <div className="flex gap-2">
        <div className="flex flex-col justify-between py-4 text-[9px] text-muted/60">
          <span>M</span>
          <span>W</span>
          <span>F</span>
          <span>S</span>
        </div>

        <div className="overflow-x-auto">
          <div className="relative mb-1 h-3">
            {monthLabels.map((m) => (
              <span
                key={`${m.col}-${m.label}`}
                className="absolute text-[9px] tracking-[0.1em] text-muted/70"
                style={{ left: m.col * (CELL + GAP) }}
              >
                {m.label}
              </span>
            ))}
          </div>

          <div className="flex" style={{ gap: GAP }}>
            {columns.map((col, ci) => (
              <div key={ci} className="flex flex-col" style={{ gap: GAP }}>
                {col.map((dateKey) => {
                  const day = byKey.get(dateKey);
                  const future = dateKey > todayKey;
                  const ratio =
                    day && day.targetMin > 0 ? day.focusMin / day.targetMin : day ? 0 : 0;

                  return (
                    <div
                      key={dateKey}
                      className="rounded-[1px]"
                      style={{
                        width: CELL,
                        height: CELL,
                        background: future ? "transparent" : heatColor(ratio),
                        outline: dateKey === todayKey ? "1px solid #7CE7FF" : "1px solid #202833",
                        outlineOffset: -1,
                        opacity: future ? 0.25 : 1,
                      }}
                      title={
                        day
                          ? `${dateKey} · ${day.focusMin}m focus / ${day.targetMin}m target · ${heatLabel(ratio)} · ${day.xp} xp`
                          : `${dateKey} · no log`
                      }
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-line pt-2 text-[9px] text-muted/70">
        <span className="tracking-[0.12em]">LESS</span>
        {HEAT_RAMP.map((c) => (
          <span key={c} className="size-2.5 rounded-[1px]" style={{ background: c }} />
        ))}
        <span className="tracking-[0.12em]">TARGET</span>
        <span className="ml-auto">
          {days.filter((d) => d.targetMin > 0 && d.focusMin >= d.targetMin).length} days at target
        </span>
      </div>
    </div>
  );
}
