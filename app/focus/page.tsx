import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { localMinutes } from "@/lib/day";
import { getOrCreateDay } from "@/lib/day-service";
import { startSession } from "@/app/actions/session";
import { SystemPanel } from "@/components/system-panel";
import { buildRounds, minutesToLabel, durationLabel, TYPE_COLOR } from "@/lib/timetable";

export default function Page() {
  return (
    <Suspense fallback={<div className="panel h-64 animate-pulse" />}>
      <FocusIndex />
    </Suspense>
  );
}

async function FocusIndex() {
  await connection();
  const day = await getOrCreateDay();
  const minutes = localMinutes();
  const sessions = await prisma.slotSession.findMany({
    where: { dayId: day.id },
    include: { rounds: true },
    orderBy: { startedAt: "desc" },
  });

  const slots = day.blocks.filter((b) => b.slotProfile !== "NONE");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-[0.2em] text-fg">FOCUS</h1>
        <p className="text-[11px] text-muted">
          One lane at a time. Every round is timestamped — closing the tab doesn&apos;t pause the clock.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {slots.map((block) => {
          const plan = buildRounds(block.endMin - block.startMin, block.slotProfile);
          const open = sessions.find((s) => s.blockId === block.id && !s.endedAt);
          const finished = sessions.find((s) => s.blockId === block.id && s.endedAt);
          const active = minutes >= block.startMin && minutes < block.endMin;
          const focusRounds = plan.filter((r) => r.kind === "focus").length;

          async function start() {
            "use server";
            await startSession(block.id);
          }

          return (
            <div
              key={block.id}
              className="panel panel-brackets"
              style={{ borderColor: active ? "#4DA3FF80" : undefined }}
            >
              <div className="flex items-start justify-between gap-2 border-b border-line px-4 py-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-1.5 shrink-0"
                      style={{ background: TYPE_COLOR[block.type] }}
                    />
                    <span className="truncate text-xs text-fg">{block.title}</span>
                  </div>
                  <div className="mt-0.5 text-[10px] text-muted">
                    {minutesToLabel(block.startMin)}–{minutesToLabel(block.endMin)} ·{" "}
                    {durationLabel(block.endMin - block.startMin)} · {block.slotProfile}
                  </div>
                </div>
                {active ? (
                  <span className="shrink-0 text-[9px] tracking-[0.16em] text-system">● NOW</span>
                ) : null}
                {block.doneAt ? (
                  <span className="shrink-0 text-[9px] tracking-[0.16em] text-ok">CLEARED</span>
                ) : null}
              </div>

              <div className="flex items-center justify-between px-4 py-2 text-[10px] text-muted">
                <span>
                  {focusRounds} focus rounds ·{" "}
                  {plan
                    .filter((r) => r.kind === "focus")
                    .map((r) => `${Math.round(r.plannedMs / 60000)}m`)
                    .join(" / ")}
                </span>
                {finished ? (
                  <span className="text-ok/80">+{finished.focusMin}m banked</span>
                ) : null}
              </div>

              <div className="border-t border-line px-3 py-2">
                {open ? (
                  <Link
                    href={`/focus/${open.id}`}
                    className="block border border-system/50 bg-system/10 px-3 py-2 text-center text-[11px] tracking-[0.2em] text-system hover:bg-system/20"
                  >
                    RESUME →
                  </Link>
                ) : (
                  <form action={start}>
                    <button
                      type="submit"
                      className="w-full border border-line px-3 py-2 text-[11px] tracking-[0.2em] text-muted transition-colors hover:border-system/50 hover:text-system"
                    >
                      START SESSION
                    </button>
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <SystemPanel title="Session log" right={`${sessions.length} today`}>
        {sessions.length === 0 ? (
          <p className="px-4 py-4 text-[11px] text-muted">
            No sessions yet. Start the slot you&apos;re supposed to be in.
          </p>
        ) : (
          <ul className="divide-y divide-line/60">
            {sessions.map((s) => {
              const block = day.blocks.find((b) => b.id === s.blockId);
              const done = s.rounds.filter((r) => r.status === "DONE").length;
              return (
                <li key={s.id} className="flex items-center gap-3 px-4 py-2 text-[11px]">
                  <span className="w-14 shrink-0 tabular-nums text-muted">
                    {s.startedAt.toISOString().slice(11, 16)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-fg/80">{block?.title ?? "slot"}</span>
                  <span className="tabular-nums text-muted">
                    {done}/{s.rounds.filter((r) => r.kind === "focus").length}
                  </span>
                  <span className="w-14 text-right tabular-nums text-ok/80">{s.focusMin}m</span>
                  <span className="w-16 text-right text-[9px] tracking-[0.14em] text-muted">
                    {s.endedAt ? "CLOSED" : "OPEN"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </SystemPanel>
    </div>
  );
}
