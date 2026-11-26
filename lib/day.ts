export const APP_TZ = process.env.APP_TZ ?? "Asia/Kolkata";

const partsFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export type LocalParts = { dateKey: string; minutes: number };

/** Local calendar date ("YYYY-MM-DD") + minutes from midnight, in APP_TZ. */
export function localParts(at: Date = new Date()): LocalParts {
  const parts = partsFmt.formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = Number(get("hour")) % 24;
  const minute = Number(get("minute"));
  return { dateKey: `${year}-${month}-${day}`, minutes: hour * 60 + minute };
}

export function localDateKey(at: Date = new Date()): string {
  return localParts(at).dateKey;
}

export function localMinutes(at: Date = new Date()): number {
  return localParts(at).minutes;
}

/** DayLog.date is a DATE column: store the local calendar day at UTC midnight. */
export function dateKeyToDbDate(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

export function dbDateToKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function nextDateKey(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function prettyDate(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00.000Z`);
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
