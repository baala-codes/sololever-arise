import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getOrCreateDay } from "@/lib/day-service";
import { localMinutes, prettyDate, localDateKey } from "@/lib/day";
import { prisma } from "@/lib/db";
import { SystemPanel } from "@/components/system-panel";
import { CheckinForm } from "@/components/checkin-form";
import { ShutdownForm } from "@/components/shutdown-form";

export default function Page() {
  return (
    <Suspense fallback={<div className="panel h-72 animate-pulse" />}>
      <Checkin />
    </Suspense>
  );
}

async function Checkin() {
  await connection();
  const day = await getOrCreateDay();
  const minutes = localMinutes();
  const hunter = await prisma.hunter.findUniqueOrThrow({ where: { id: "local" } });

  if (day.checkedInAt) redirect("/");

  const deep = day.blocks.filter((b) => b.type === "DEEP_WORK" || b.type === "LEARNING");
  const deepHours = deep.reduce((s, b) => s + (b.endMin - b.startMin), 0) / 60;
  const suggestSleep = 8;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <SystemPanel title="System" accent="#4DA3FF" right={prettyDate(localDateKey())}>
        <div className="space-y-2 px-4 py-4">
          <p className="text-xs text-system">[ SYSTEM ]</p>
          <p className="text-sm text-fg">Daily Quest has arrived. Answer honestly.</p>
          <div className="grid grid-cols-3 gap-2 pt-2 text-[10px] text-muted">
            <div className="border border-line px-2 py-1.5">
              <div className="label">streak</div>
              <div className="text-sm text-amber">{hunter.streak}d</div>
            </div>
            <div className="border border-line px-2 py-1.5">
              <div className="label">level</div>
              <div className="text-sm text-fg">{hunter.level}</div>
            </div>
            <div className="border border-line px-2 py-1.5">
              <div className="label">time</div>
              <div className="text-sm text-fg">
                {String(Math.floor(minutes / 60)).padStart(2, "0")}:
                {String(minutes % 60).padStart(2, "0")}
              </div>
            </div>
          </div>
          <p className="pt-1 text-[10px] text-muted">
            {minutes >= 720
              ? "Late check-in — half XP. The day is still yours."
              : `Scheduled deep work today: ${deepHours}h across ${deep.length} slots.`}
          </p>
        </div>
      </SystemPanel>

      <CheckinForm defaultSleep={suggestSleep} />

      {minutes >= 22 * 60 ? (
        <SystemPanel title="Shutdown" accent="#2BD98A">
          <ShutdownForm />
        </SystemPanel>
      ) : null}
    </div>
  );
}
