import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Runner } from "@/components/runner";

export default function Page({ params }: { params: Promise<{ sessionId: string }> }) {
  return (
    <Suspense fallback={<div className="panel mx-auto h-96 max-w-2xl animate-pulse" />}>
      <Session params={params} />
    </Suspense>
  );
}

async function Session({ params }: { params: Promise<{ sessionId: string }> }) {
  await connection();
  const { sessionId } = await params;

  const session = await prisma.slotSession.findUnique({
    where: { id: sessionId },
    include: { rounds: { orderBy: { index: "asc" } }, block: true },
  });

  if (!session) notFound();

  const microTasks = Array.isArray(session.block.microTasks)
    ? (session.block.microTasks as string[])
    : [];

  return (
    <Runner
      sessionId={session.id}
      blockTitle={session.block.title}
      subtitle={session.block.subtitle}
      microTasks={microTasks}
      switches={session.switches}
      rounds={session.rounds.map((r) => ({
        id: r.id,
        index: r.index,
        kind: r.kind,
        plannedMs: r.plannedMs,
        startedAt: r.startedAt ? r.startedAt.toISOString() : null,
        focusedMs: r.focusedMs,
        status: r.status,
      }))}
    />
  );
}
