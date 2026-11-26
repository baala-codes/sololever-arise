import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const HABITS = [
  { slug: "oats", label: "Oats + seeds (morning intake)", atMin: 455, xp: 20, core: true, order: 1 },
  { slug: "eggs-am", label: "2 boiled eggs — morning break", atMin: 600, xp: 20, order: 2 },
  { slug: "hair-oil", label: "Apply hair oil (after egg break)", atMin: 615, xp: 20, order: 3 },
  { slug: "eggs-pm", label: "2 boiled eggs — evening break", atMin: 990, xp: 20, order: 4 },
  { slug: "tea", label: "Tea with Karthick", atMin: 1060, xp: 15, order: 5 },
  { slug: "shutdown", label: "Shutdown ritual + journal", atMin: 1370, xp: 60, core: true, order: 6 },
  { slug: "sleep", label: "Sleep by 23:00", atMin: 1380, xp: 80, core: true, order: 7 },
];

type SeedExercise = {
  slug: string;
  name: string;
  split: "A" | "B";
  unit: "REPS" | "SECONDS";
  sets: number;
  currentValue: number;
  increment: number;
  cap: number | null;
  xp: number;
  order: number;
};

/** Targets start at today's real numbers; the dungeon scales them as you clear floors. */
const EXERCISES: SeedExercise[] = [
  { slug: "pull-ups", name: "Pull-ups (grease the groove)", split: "A", unit: "REPS", sets: 5, currentValue: 6, increment: 1, cap: 20, xp: 30, order: 1 },
  { slug: "pushups-normal", name: "Push-ups — normal", split: "A", unit: "REPS", sets: 3, currentValue: 40, increment: 2, cap: 80, xp: 25, order: 2 },
  { slug: "pushups-diamond", name: "Push-ups — diamond", split: "A", unit: "REPS", sets: 2, currentValue: 20, increment: 2, cap: 50, xp: 20, order: 3 },
  { slug: "pushups-wide", name: "Push-ups — wide", split: "A", unit: "REPS", sets: 3, currentValue: 15, increment: 2, cap: 45, xp: 20, order: 4 },
  { slug: "crunches", name: "Crunches", split: "B", unit: "REPS", sets: 2, currentValue: 30, increment: 5, cap: 60, xp: 15, order: 5 },
  { slug: "side-crunches", name: "Side crunches", split: "B", unit: "REPS", sets: 2, currentValue: 20, increment: 5, cap: 40, xp: 15, order: 6 },
  { slug: "squats", name: "Squats", split: "B", unit: "REPS", sets: 3, currentValue: 25, increment: 5, cap: 60, xp: 20, order: 7 },
  { slug: "bridge", name: "Glute bridge", split: "B", unit: "REPS", sets: 3, currentValue: 15, increment: 5, cap: 40, xp: 15, order: 8 },
  { slug: "plank", name: "Plank", split: "B", unit: "SECONDS", sets: 3, currentValue: 45, increment: 10, cap: 240, xp: 20, order: 9 },
  { slug: "skips", name: "Skipping rope", split: "B", unit: "REPS", sets: 4, currentValue: 500, increment: 100, cap: 3000, xp: 25, order: 10 },
];

const PROBLEMS = [
  { slug: "two-sum", difficulty: "EASY", pattern: "HASHMAP" },
  { slug: "valid-parentheses", difficulty: "EASY", pattern: "STACK" },
  { slug: "merge-two-sorted-lists", difficulty: "EASY", pattern: "LINKED_LIST" },
  { slug: "best-time-to-buy-and-sell-stock", difficulty: "EASY", pattern: "ARRAYS" },
  { slug: "binary-search", difficulty: "EASY", pattern: "BINARY_SEARCH" },
  { slug: "climbing-stairs", difficulty: "EASY", pattern: "DP" },
  { slug: "longest-substring-without-repeating-characters", difficulty: "MEDIUM", pattern: "SLIDING_WINDOW" },
  { slug: "container-with-most-water", difficulty: "MEDIUM", pattern: "TWO_POINTERS" },
  { slug: "kth-largest-element-in-an-array", difficulty: "MEDIUM", pattern: "HEAP" },
  { slug: "number-of-islands", difficulty: "MEDIUM", pattern: "GRAPHS" },
  { slug: "merge-intervals", difficulty: "MEDIUM", pattern: "INTERVALS" },
  { slug: "word-break", difficulty: "MEDIUM", pattern: "DP" },
  { slug: "implement-trie-prefix-tree", difficulty: "MEDIUM", pattern: "TRIES" },
  { slug: "lru-cache", difficulty: "MEDIUM", pattern: "DESIGN" },
  { slug: "trapping-rain-water", difficulty: "HARD", pattern: "TWO_POINTERS" },
] as const;

function titleOf(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

async function main() {
  await prisma.hunter.upsert({
    where: { id: "local" },
    create: { id: "local", handle: "Hunter" },
    update: {},
  });

  for (const key of ["STR", "INT", "AGI", "VIT", "PER"] as const) {
    await prisma.statPoint.upsert({
      where: { hunterId_key: { hunterId: "local", key } },
      create: { hunterId: "local", key },
      update: {},
    });
  }

  for (const h of HABITS) {
    await prisma.habitDef.upsert({
      where: { slug: h.slug },
      create: h,
      update: { label: h.label, atMin: h.atMin, xp: h.xp, core: h.core, order: h.order },
    });
  }

  for (const e of EXERCISES) {
    await prisma.exercise.upsert({
      where: { slug: e.slug },
      create: { ...e, baseValue: e.currentValue },
      update: { name: e.name, split: e.split, sets: e.sets, increment: e.increment, cap: e.cap, xp: e.xp, order: e.order },
    });
  }

  for (const p of PROBLEMS) {
    await prisma.problem.upsert({
      where: { slug: p.slug },
      create: {
        slug: p.slug,
        title: titleOf(p.slug),
        url: `https://leetcode.com/problems/${p.slug}/`,
        difficulty: p.difficulty,
        pattern: p.pattern,
      },
      update: { title: titleOf(p.slug), difficulty: p.difficulty, pattern: p.pattern },
    });
  }

  console.log(
    `seeded hunter + ${HABITS.length} habits + ${EXERCISES.length} exercises + ${PROBLEMS.length} problems`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
