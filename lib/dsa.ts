import type { Difficulty, Pattern } from "@/lib/generated/prisma/client";

export const PATTERN_LABEL: Record<Pattern, string> = {
  ARRAYS: "arrays",
  STRINGS: "strings",
  HASHMAP: "hash map",
  TWO_POINTERS: "two pointers",
  SLIDING_WINDOW: "sliding window",
  BINARY_SEARCH: "binary search",
  STACK: "stack",
  LINKED_LIST: "linked list",
  TREES: "trees",
  HEAP: "heap",
  GRAPHS: "graphs",
  DP: "dp",
  GREEDY: "greedy",
  BACKTRACKING: "backtracking",
  TRIES: "tries",
  BITS: "bits",
  MATH: "math",
  INTERVALS: "intervals",
  DESIGN: "design",
};

/** Roughly how many solved problems make a pattern interview-safe. */
export const PATTERN_TARGET = 8;

export const DIFFICULTY_XP: Record<Difficulty, number> = { EASY: 30, MEDIUM: 60, HARD: 120 };

export const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  EASY: "#2BD98A",
  MEDIUM: "#E8A33D",
  HARD: "#FF3B4E",
};

export const STATUS_COLOR: Record<string, string> = {
  TODO: "#7C8DA6",
  SOLVED: "#2BD98A",
  REVISIT: "#E8A33D",
};
