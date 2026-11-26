import Link from "next/link";
import { startSession } from "@/app/actions/session";
import { SystemPanel } from "@/components/system-panel";
import { minutesToLabel, TYPE_COLOR, TYPE_LABEL, type BlockType } from "@/lib/timetable";

export type CardBlock = {
  id: string;
  title: string;
  subtitle: string | null;
  startMin: number;
  endMin: number;
  type: BlockType;
  slotProfile: string;
  doneAt: Date | null;
};

export function NowCard({
  block,
  next,
  minutesNow,
  activeSessionId,
  focusTarget,
  load,
}: {
  block: CardBlock | null;
  next: CardBlock | null;
  minutesNow: number;
  activeSessionId: string | null;
  focusTarget: string | null;
  load: string;
}) {
  if (!block) {
    return (
      <SystemPanel title="Now" accent={TYPE_COLOR.SLEEP}>
        <div className="px-4 py-8 text-center text-xs text-muted">
          No scheduled block at {minutesToLabel(minutesNow)}.
          <br />
          <Link href="/timetable" className="mt-2 inline-block text-system hover:underline">
            view the timetable →
          </Link>
        </div>
      </SystemPanel>
    );
  }

  const total = Math.max(1, block.endMin - block.startMin);
  const elapsed = Math.min(total, Math.max(0, minutesNow - block.startMin));
  const pct = Math.round((elapsed / total) * 100);
  const remaining = Math.max(0, block.endMin - minutesNow);
  const runnable = block.slotProfile !== "NONE";

  async function start() {
    "use server";
    if (!block) return;
    await startSession(block.id);
  }

  return (
    <SystemPanel
      title="Now"
      accent={TYPE_COLOR[block.type]}
      right={`${TYPE_LABEL[block.type]} · ${pct}%`}
    >
      <div className="px-4 py-4">
        <div className="flex items-baseline gap-3">
          <span className="text-xs tabular-nums text-muted">
            {minutesToLabel(block.startMin)}–{minutesToLabel(block.endMin)}
          </span>
          {block.doneAt ? (
            <span className="border border-ok/40 px-1 text-[9px] tracking-[0.14em] text-ok">
              CLEARED
            </span>
          ) : null}
        </div>

        <h3 className="mt-1 text-xl leading-tight font-semibold text-fg">{block.title}</h3>
        {block.subtitle ? <p className="mt-1 text-xs text-muted">{block.subtitle}</p> : null}

        <div className="mt-3 h-1 w-full bg-line/70">
          <div
            className="h-full"
            style={{ width: `${pct}%`, background: TYPE_COLOR[block.type] }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-muted">
          <span>{remaining}m left</span>
          <span>{load} load</span>
        </div>

        {focusTarget ? (
          <p className="mt-3 border-l-2 border-system/40 pl-2 text-[11px] text-fg/80">
            <span className="text-muted">focus: </span>
            {focusTarget}
          </p>
        ) : null}

        <div className="mt-4 flex items-stretch gap-2">
          {activeSessionId ? (
            <Link
              href={`/focus/${activeSessionId}`}
              className="flex-1 border border-system/50 bg-system/10 px-3 py-2 text-center text-xs tracking-[0.18em] text-system transition-colors hover:bg-system/20"
            >
              RESUME SLOT →
            </Link>
          ) : runnable ? (
            <form action={start} className="flex-1">
              <button
                type="submit"
                className="w-full border border-system/50 bg-system/10 px-3 py-2 text-xs tracking-[0.18em] text-system transition-colors hover:bg-system/20"
              >
                START SLOT ▶
              </button>
            </form>
          ) : (
            <div className="flex-1 border border-line px-3 py-2 text-center text-xs tracking-[0.18em] text-muted">
              NO TIMER — RITUAL BLOCK
            </div>
          )}
          <Link
            href="/focus"
            className="border border-line px-3 py-2 text-xs tracking-[0.18em] text-muted transition-colors hover:border-line2 hover:text-fg"
          >
            ALL
          </Link>
        </div>

        {next ? (
          <div className="mt-3 flex items-center gap-2 border-t border-line pt-2 text-[10px] text-muted">
            <span className="tracking-[0.18em]">NEXT</span>
            <span className="tabular-nums">{minutesToLabel(next.startMin)}</span>
            <span className="truncate text-fg/70">{next.title}</span>
          </div>
        ) : null}
      </div>
    </SystemPanel>
  );
}
