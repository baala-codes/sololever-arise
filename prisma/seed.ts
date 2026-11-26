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

  console.log(`seeded hunter + ${HABITS.length} habits`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
