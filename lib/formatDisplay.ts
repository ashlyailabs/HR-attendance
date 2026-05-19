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

/** Normalize sheet/display date strings to ISO `YYYY-MM-DD` for consistent keys and storage. */
export function normalizeToISO(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const MONTHS: Record<string, string> = {
    Jan: "01",
    Feb: "02",
    Mar: "03",
    Apr: "04",
    May: "05",
    Jun: "06",
    Jul: "07",
    Aug: "08",
    Sep: "09",
    Oct: "10",
    Nov: "11",
    Dec: "12",
  };
  const m = trimmed.match(/^(\d{2})\s(\w{3})\s(\d{4})$/);
  if (m) {
    const monKey =
      m[2].charAt(0).toUpperCase() + m[2].slice(1).toLowerCase();
    return `${m[3]}-${MONTHS[monKey] ?? "01"}-${m[1]}`;
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
    const [d, mo, y] = trimmed.split("-");
    return `${y}-${mo}-${d}`;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [d, mo, y] = trimmed.split("/");
    return `${y}-${mo}-${d}`;
  }
  return trimmed;
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
