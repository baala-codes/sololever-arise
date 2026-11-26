-- CreateEnum
CREATE TYPE "WorkoutSplit" AS ENUM ('A', 'B');

-- CreateEnum
CREATE TYPE "ExerciseUnit" AS ENUM ('REPS', 'SECONDS');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "ProblemStatus" AS ENUM ('TODO', 'SOLVED', 'REVISIT');

-- CreateEnum
CREATE TYPE "Pattern" AS ENUM ('ARRAYS', 'STRINGS', 'HASHMAP', 'TWO_POINTERS', 'SLIDING_WINDOW', 'BINARY_SEARCH', 'STACK', 'LINKED_LIST', 'TREES', 'HEAP', 'GRAPHS', 'DP', 'GREEDY', 'BACKTRACKING', 'TRIES', 'BITS', 'MATH', 'INTERVALS', 'DESIGN');

-- CreateEnum
CREATE TYPE "ReviewGrade" AS ENUM ('AGAIN', 'HARD', 'GOOD', 'EASY');

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "split" "WorkoutSplit" NOT NULL,
    "unit" "ExerciseUnit" NOT NULL DEFAULT 'REPS',
    "sets" INTEGER NOT NULL DEFAULT 3,
    "currentValue" INTEGER NOT NULL,
    "baseValue" INTEGER NOT NULL,
    "increment" INTEGER NOT NULL DEFAULT 5,
    "cap" INTEGER,
    "xp" INTEGER NOT NULL DEFAULT 10,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workout" (
    "id" TEXT NOT NULL,
    "dayId" TEXT,
    "date" DATE NOT NULL,
    "split" "WorkoutSplit" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "xp" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Workout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutItem" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "setIndex" INTEGER NOT NULL,
    "value" INTEGER NOT NULL,
    "doneAt" TIMESTAMP(3),

    CONSTRAINT "WorkoutItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Problem" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "pattern" "Pattern" NOT NULL,
    "status" "ProblemStatus" NOT NULL DEFAULT 'TODO',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "ease" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "intervalDays" INTEGER NOT NULL DEFAULT 0,
    "dueAt" DATE,
    "solvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Problem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "grade" "ReviewGrade" NOT NULL,
    "intervalDays" INTEGER NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_slug_key" ON "Exercise"("slug");

-- CreateIndex
CREATE INDEX "Workout_date_idx" ON "Workout"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Workout_date_split_key" ON "Workout"("date", "split");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutItem_workoutId_exerciseId_setIndex_key" ON "WorkoutItem"("workoutId", "exerciseId", "setIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Problem_slug_key" ON "Problem"("slug");

-- CreateIndex
CREATE INDEX "Problem_dueAt_idx" ON "Problem"("dueAt");

-- CreateIndex
CREATE INDEX "Problem_pattern_idx" ON "Problem"("pattern");

-- CreateIndex
CREATE INDEX "Review_problemId_idx" ON "Review"("problemId");

-- AddForeignKey
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "DayLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutItem" ADD CONSTRAINT "WorkoutItem_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutItem" ADD CONSTRAINT "WorkoutItem_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
