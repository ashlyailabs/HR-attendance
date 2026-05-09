const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function isoDateToDDMMYYYY(iso: string): string {
  if (!iso) return iso;
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  const monthName = MONTHS[parseInt(m, 10) - 1] ?? m;
  return `${d} ${monthName} ${y}`;
}

/**
 * Compact hours/minutes for status badges.
 * Under 1 hour: `"45m"`. One hour or more: `"8h 9m"`.
 */
export function minsToHM(mins: number): string {
  const n = Math.max(0, Math.round(Number(mins) || 0));
  if (n < 60) return `${n}m`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return `${h}h ${m}m`;
}

/** Human-readable today's date for export filenames (e.g. `06 May 2026`). */
export function formatTodayDDMMYYYY(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return isoDateToDDMMYYYY(`${y}-${m}-${day}`);
}
