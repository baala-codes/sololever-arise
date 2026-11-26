export type BlockType =
  | "RITUAL"
  | "DEEP_WORK"
  | "LEARNING"
  | "MEAL"
  | "RECOVERY"
  | "PHYSICAL"
  | "SOCIAL"
  | "SLEEP";

export type SlotProfile = "DEEP" | "CLASSIC" | "MICRO" | "NONE";

export type TemplateBlock = {
  title: string;
  subtitle?: string;
  startMin: number;
  endMin: number;
  type: BlockType;
  slotProfile: SlotProfile;
  microTasks?: string[];
};

export const SLOT_CONFIG: Record<Exclude<SlotProfile, "NONE">, { focus: number; brk: number }> = {
  DEEP: { focus: 50, brk: 10 },
  CLASSIC: { focus: 25, brk: 5 },
  MICRO: { focus: 25, brk: 5 },
};

/**
 * The canonical day. Materialized into Block rows when a DayLog is first created.
 * Keep in sync with PLAN.md §3.1 (13 blocks, 07:00 -> 24:00 = exactly 24h).
 */
export const DAY_TEMPLATE: TemplateBlock[] = [
  {
    title: "Wake + bath + weigh-in",
    startMin: 420,
    endMin: 450,
    type: "RITUAL",
    slotProfile: "NONE",
  },
  {
    title: "Oats + seeds · plan the day",
    subtitle: "Morning intake, then check-in issues the Daily Quest",
    startMin: 450,
    endMin: 480,
    type: "RITUAL",
    slotProfile: "NONE",
  },
  {
    title: "LeetCode — pure DSA",
    subtitle: "Hardest problems first. One problem at a time.",
    startMin: 480,
    endMin: 660,
    type: "DEEP_WORK",
    slotProfile: "DEEP",
    microTasks: ["2 boiled eggs", "Apply hair oil", "6 pull-ups", "Water + 20-ft look"],
  },
  {
    title: "DDIA + tech updates",
    subtitle: "40m Designing Data-Intensive Applications · 20m YouTube",
    startMin: 660,
    endMin: 720,
    type: "LEARNING",
    slotProfile: "MICRO",
    microTasks: ["Water", "Stand 2 min"],
  },
  {
    title: "Cook chicken + lunch",
    subtitle: "Watch Akshat Srivastava on investing",
    startMin: 720,
    endMin: 795,
    type: "MEAL",
    slotProfile: "NONE",
  },
  {
    title: "Reset — nap (20m max) or walk",
    startMin: 795,
    endMin: 840,
    type: "RECOVERY",
    slotProfile: "NONE",
  },
  {
    title: "100x cohort",
    startMin: 840,
    endMin: 1020,
    type: "DEEP_WORK",
    slotProfile: "DEEP",
    microTasks: ["2 boiled eggs", "6 pull-ups", "Water", "Stand 2 min"],
  },
  {
    title: "Workout — block A",
    subtitle: "Pull-up bank + push-ups",
    startMin: 1020,
    endMin: 1050,
    type: "PHYSICAL",
    slotProfile: "NONE",
  },
  {
    title: "Tea with Karthick",
    subtitle: "Protected. Not a work slot.",
    startMin: 1050,
    endMin: 1080,
    type: "SOCIAL",
    slotProfile: "NONE",
  },
  {
    title: "LeetCode ↔ Hackathon",
    subtitle: "Dual lane — 50m each, one lane at a time",
    startMin: 1080,
    endMin: 1230,
    type: "DEEP_WORK",
    slotProfile: "DEEP",
    microTasks: ["6 pull-ups", "Agent status: read-only", "Water"],
  },
  {
    title: "Dinner",
    startMin: 1230,
    endMin: 1260,
    type: "MEAL",
    slotProfile: "NONE",
  },
  {
    title: "100x cohort ↔ Hackathon",
    subtitle: "Dual lane · dispatch overnight agents at the end",
    startMin: 1260,
    endMin: 1350,
    type: "DEEP_WORK",
    slotProfile: "DEEP",
    microTasks: ["6 pull-ups", "Dispatch 1 agent", "Water"],
  },
  {
    title: "Workout block B + journal + shutdown",
    subtitle: "Core, plank, skips · top 3 for tomorrow",
    startMin: 1350,
    endMin: 1380,
    type: "PHYSICAL",
    slotProfile: "NONE",
  },
  {
    title: "Sleep",
    subtitle: "Hard floor. Sleep is the stat that gates all others.",
    startMin: 1380,
    endMin: 1440,
    type: "SLEEP",
    slotProfile: "NONE",
  },
];

export const TYPE_COLOR: Record<BlockType, string> = {
  RITUAL: "#7C8DA6",
  DEEP_WORK: "#4DA3FF",
  LEARNING: "#38D9C0",
  MEAL: "#E8A33D",
  RECOVERY: "#8B5CF6",
  PHYSICAL: "#2BD98A",
  SOCIAL: "#E86AA6",
  SLEEP: "#3A4A5E",
};

export const TYPE_LABEL: Record<BlockType, string> = {
  RITUAL: "ritual",
  DEEP_WORK: "deep work",
  LEARNING: "learning",
  MEAL: "meal",
  RECOVERY: "recovery",
  PHYSICAL: "physical",
  SOCIAL: "social",
  SLEEP: "sleep",
};

export type RoundPlan = { index: number; kind: "focus" | "break"; plannedMs: number };

/** Split a slot into pomodoro rounds that sum to the slot length exactly. */
export function buildRounds(targetMin: number, profile: SlotProfile): RoundPlan[] {
  if (profile === "NONE" || targetMin <= 0) return [];
  const { focus, brk } = SLOT_CONFIG[profile];
  const rounds: RoundPlan[] = [];
  let rem = targetMin;
  while (rem >= focus + brk) {
    rounds.push({ index: rounds.length, kind: "focus", plannedMs: focus * 60_000 });
    rounds.push({ index: rounds.length, kind: "break", plannedMs: brk * 60_000 });
    rem -= focus + brk;
  }
  if (rem > brk) {
    rounds.push({ index: rounds.length, kind: "focus", plannedMs: (rem - brk) * 60_000 });
    rounds.push({ index: rounds.length, kind: "break", plannedMs: brk * 60_000 });
  } else if (rem > 0) {
    rounds.push({ index: rounds.length, kind: "focus", plannedMs: rem * 60_000 });
  }
  return rounds;
}

export function minutesToLabel(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function durationLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}
