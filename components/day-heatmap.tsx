import { minutesToLabel, TYPE_COLOR, TYPE_LABEL, type BlockType } from "@/lib/timetable";

export type HeatBlock = {
  id: string;
  title: string;
  startMin: number;
  endMin: number;
  type: BlockType;
  doneAt: Date | null;
};

const HOUR_TICKS = [0, 3, 6, 9, 12, 15, 18, 21, 24];

/**
 * One day as a single 24h strip: every block painted in its own colour.
 * Opacity carries the state — cleared blocks burn full, blocks that slipped
 * away go dim, the block you're in pulses.
 */
export function DayHeatmap({ blocks, minutesNow }: { blocks: HeatBlock[]; minutesNow: number }) {
  const doneMinutes = blocks
    .filter((b) => b.doneAt)
    .reduce((sum, b) => sum + (b.endMin - b.startMin), 0);

  return (
    <div className="px-4 py-3">
      <div className="relative">
        <div className="flex h-9 w-full overflow-hidden border border-line">
          {blocks.map((block) => {
            const width = ((block.endMin - block.startMin) / 1440) * 100;
            const active = minutesNow >= block.startMin && minutesNow < block.endMin;
            const past = minutesNow >= block.endMin;
            const opacity = block.doneAt ? 1 : active ? 0.85 : past ? 0.28 : 0.45;

            return (
              <div
                key={block.id}
                className={`h-full border-r border-bg/80 last:border-r-0 ${
                  active ? "animate-pulse" : ""
                }`}
                style={{ width: `${width}%`, background: TYPE_COLOR[block.type], opacity }}
                title={`${minutesToLabel(block.startMin)}–${minutesToLabel(block.endMin)} · ${block.title}`}
              />
            );
          })}
        </div>

        {minutesNow >= 0 && minutesNow <= 1440 ? (
          <span
            aria-hidden
            className="pointer-events-none absolute -top-1 -bottom-1 w-px bg-fg"
            style={{ left: `${(minutesNow / 1440) * 100}%` }}
          />
        ) : null}
      </div>

      <div className="relative mt-1 h-3">
        {HOUR_TICKS.map((h) => (
          <span
            key={h}
            className="absolute text-[9px] tabular-nums text-muted/70"
            style={{
              left: `${(h / 1440) * 100}%`,
              transform: h === 24 ? "translateX(-100%)" : h === 0 ? "none" : "translateX(-50%)",
            }}
          >
            {String(h).padStart(2, "0")}
          </span>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line pt-2">
        {(Object.keys(TYPE_COLOR) as BlockType[]).map((type) => {
          const mins = blocks
            .filter((b) => b.type === type)
            .reduce((sum, b) => sum + (b.endMin - b.startMin), 0);
          if (mins === 0) return null;
          return (
            <span key={type} className="flex items-center gap-1.5 text-[9px] tracking-[0.12em] text-muted">
              <span className="size-1.5" style={{ background: TYPE_COLOR[type] }} />
              {TYPE_LABEL[type]}
              <span className="tabular-nums text-muted/60">
                {Math.floor(mins / 60)}h{mins % 60 ? `${mins % 60}` : ""}
              </span>
            </span>
          );
        })}
        <span className="ml-auto text-[9px] tracking-[0.12em] text-muted/60">
          {Math.round(doneMinutes / 60)}h cleared
        </span>
      </div>
    </div>
  );
}
