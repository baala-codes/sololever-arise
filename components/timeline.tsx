import Link from "next/link";
import { minutesToLabel, TYPE_COLOR, TYPE_LABEL, type BlockType } from "@/lib/timetable";

export type TimelineBlock = {
  id: string;
  title: string;
  subtitle: string | null;
  startMin: number;
  endMin: number;
  type: BlockType;
  slotProfile: string;
  doneAt: Date | null;
};

export function Timeline({
  blocks,
  minutesNow,
  compact = false,
}: {
  blocks: TimelineBlock[];
  minutesNow: number;
  compact?: boolean;
}) {
  return (
    <ol className="relative">
      {blocks.map((block) => {
        const active = minutesNow >= block.startMin && minutesNow < block.endMin;
        const past = minutesNow >= block.endMin;
        const color = TYPE_COLOR[block.type];

        return (
          <li
            key={block.id}
            className={`relative flex gap-3 border-b border-line/60 px-4 py-2.5 last:border-b-0 ${
              active ? "bg-system/[0.06]" : ""
            } ${past && !block.doneAt ? "opacity-60" : ""}`}
          >
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 w-0.5"
              style={{ background: color, opacity: active ? 1 : 0.35 }}
            />
            <div className="w-20 shrink-0 text-[10px] leading-5 tabular-nums text-muted">
              {minutesToLabel(block.startMin)}
              <div className="text-[9px] text-muted/60">{minutesToLabel(block.endMin)}</div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-xs text-fg">{block.title}</span>
                {active ? (
                  <span className="shrink-0 text-[9px] tracking-[0.18em] text-system">● NOW</span>
                ) : null}
                {block.doneAt ? (
                  <span className="shrink-0 text-[9px] tracking-[0.14em] text-ok">✓</span>
                ) : null}
              </div>
              {!compact && block.subtitle ? (
                <p className="truncate text-[10px] text-muted">{block.subtitle}</p>
              ) : null}
              <div className="mt-0.5 flex items-center gap-2 text-[9px] tracking-[0.14em] text-muted/70">
                <span style={{ color }}>{TYPE_LABEL[block.type]}</span>
                {block.slotProfile !== "NONE" ? (
                  <span className="text-system/60">{block.slotProfile}</span>
                ) : null}
              </div>
            </div>

            {block.slotProfile !== "NONE" ? (
              <Link
                href="/focus"
                className="self-center border border-line px-2 py-1 text-[9px] tracking-[0.14em] text-muted transition-colors hover:border-system/50 hover:text-system"
              >
                {block.doneAt ? "AGAIN" : "FOCUS"}
              </Link>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
