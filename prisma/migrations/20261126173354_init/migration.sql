-- CreateEnum
CREATE TYPE "StatKey" AS ENUM ('STR', 'INT', 'AGI', 'VIT', 'PER');

-- CreateEnum
CREATE TYPE "Load" AS ENUM ('MINIMUM', 'STANDARD', 'SPRINT');

-- CreateEnum
CREATE TYPE "BlockType" AS ENUM ('RITUAL', 'DEEP_WORK', 'LEARNING', 'MEAL', 'RECOVERY', 'PHYSICAL', 'SOCIAL', 'SLEEP');

-- CreateEnum
CREATE TYPE "SlotProfile" AS ENUM ('DEEP', 'CLASSIC', 'MICRO', 'NONE');

-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('PENDING', 'RUNNING', 'DONE', 'ABANDONED');

-- CreateTable
CREATE TABLE "Hunter" (
    "id" TEXT NOT NULL DEFAULT 'local',
    "handle" TEXT NOT NULL DEFAULT 'Hunter',
    "level" INTEGER NOT NULL DEFAULT 1,
    "totalXp" INTEGER NOT NULL DEFAULT 0,
    "freePoints" INTEGER NOT NULL DEFAULT 0,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "bestStreak" INTEGER NOT NULL DEFAULT 0,
    "slotDebt" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Hunter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatPoint" (
    "id" TEXT NOT NULL,
    "hunterId" TEXT NOT NULL,
    "key" "StatKey" NOT NULL,
    "allocated" INTEGER NOT NULL DEFAULT 0,
    "xp" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StatPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DayLog" (
    "id" TEXT NOT NULL,
    "hunterId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "load" "Load" NOT NULL DEFAULT 'STANDARD',
    "sleepHours" DOUBLE PRECISION,
    "sleepQuality" INTEGER,
    "energy" INTEGER,
    "mood" INTEGER,
    "weightKg" DOUBLE PRECISION,
    "focusTarget" TEXT,
    "checkedInAt" TIMESTAMP(3),
    "lateCheckIn" BOOLEAN NOT NULL DEFAULT false,
    "shutdownAt" TIMESTAMP(3),
    "journal" TEXT,
    "top3" JSONB,
    "focusMinutes" INTEGER NOT NULL DEFAULT 0,
    "workTargetMin" INTEGER NOT NULL DEFAULT 660,
    "score" INTEGER,
    "closedAt" TIMESTAMP(3),
    "xpTotal" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DayLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Block" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "startMin" INTEGER NOT NULL,
    "endMin" INTEGER NOT NULL,
    "type" "BlockType" NOT NULL,
    "slotProfile" "SlotProfile" NOT NULL DEFAULT 'NONE',
    "microTasks" JSONB,
    "doneAt" TIMESTAMP(3),

    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlotSession" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "targetMin" INTEGER NOT NULL,
    "focusMin" INTEGER NOT NULL DEFAULT 0,
    "switches" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SlotSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Round" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "plannedMs" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "focusedMs" INTEGER NOT NULL DEFAULT 0,
    "status" "RoundStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HabitDef" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "atMin" INTEGER,
    "xp" INTEGER NOT NULL DEFAULT 20,
    "core" BOOLEAN NOT NULL DEFAULT false,
    "wantsEgg" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "HabitDef_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HabitLog" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "doneAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HabitLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XpLedger" (
    "id" TEXT NOT NULL,
    "dayId" TEXT,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL DEFAULT '',
    "stat" "StatKey",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "XpLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StatPoint_hunterId_key_key" ON "StatPoint"("hunterId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "DayLog_date_key" ON "DayLog"("date");

-- CreateIndex
CREATE INDEX "DayLog_date_idx" ON "DayLog"("date");

-- CreateIndex
CREATE INDEX "Block_dayId_order_idx" ON "Block"("dayId", "order");

-- CreateIndex
CREATE INDEX "SlotSession_dayId_idx" ON "SlotSession"("dayId");

-- CreateIndex
CREATE UNIQUE INDEX "Round_sessionId_index_key" ON "Round"("sessionId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "HabitDef_slug_key" ON "HabitDef"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "HabitLog_dayId_habitId_key" ON "HabitLog"("dayId", "habitId");

-- CreateIndex
CREATE INDEX "XpLedger_createdAt_idx" ON "XpLedger"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "XpLedger_reason_sourceId_key" ON "XpLedger"("reason", "sourceId");

-- AddForeignKey
ALTER TABLE "StatPoint" ADD CONSTRAINT "StatPoint_hunterId_fkey" FOREIGN KEY ("hunterId") REFERENCES "Hunter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayLog" ADD CONSTRAINT "DayLog_hunterId_fkey" FOREIGN KEY ("hunterId") REFERENCES "Hunter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "DayLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotSession" ADD CONSTRAINT "SlotSession_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "DayLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotSession" ADD CONSTRAINT "SlotSession_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "Block"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SlotSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitLog" ADD CONSTRAINT "HabitLog_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "DayLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitLog" ADD CONSTRAINT "HabitLog_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "HabitDef"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XpLedger" ADD CONSTRAINT "XpLedger_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "DayLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
