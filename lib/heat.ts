/** Colour ramp for focus intensity. Empty stays near the panel colour. */
export const HEAT_RAMP = ["#141A23", "#1B3A4B", "#245A78", "#357FAA", "#4DA3FF", "#7CE7FF"] as const;

export function heatStep(ratio: number): number {
  if (ratio <= 0) return 0;
  if (ratio < 0.25) return 1;
  if (ratio < 0.5) return 2;
  if (ratio < 0.75) return 3;
  if (ratio < 1) return 4;
  return 5;
}

export function heatColor(ratio: number): string {
  return HEAT_RAMP[heatStep(ratio)];
}

export function heatLabel(ratio: number): string {
  if (ratio <= 0) return "nothing";
  if (ratio < 0.25) return "warm-up";
  if (ratio < 0.5) return "partial";
  if (ratio < 0.75) return "solid";
  if (ratio < 1) return "near target";
  return "target hit";
}

/** Weekday index (Mon = 0) for a "YYYY-MM-DD" key. */
export function weekdayIndex(dateKey: string): number {
  const d = new Date(`${dateKey}T00:00:00.000Z`);
  return (d.getUTCDay() + 6) % 7;
}

export function addDaysKey(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
