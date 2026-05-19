export type Holiday = {
  date: string;
  name: string;
};

const FIXED_HOLIDAYS = [
  { month: 1, day: 26, name: "Republic Day" },
  { month: 5, day: 1, name: "May Day" },
  { month: 8, day: 15, name: "Independence Day" },
  { month: 10, day: 2, name: "Gandhi Jayanthi" },
  { month: 12, day: 25, name: "Christmas" },
] as const;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function generateHolidaysForYear(year: number): Holiday[] {
  return FIXED_HOLIDAYS.map((h) => ({
    date: `${year}-${pad(h.month)}-${pad(h.day)}`,
    name: h.name,
  }));
}

export function getHolidayMap(): Map<string, Holiday> {
  const currentYear = new Date().getFullYear();
  const map = new Map<string, Holiday>();
  for (const year of [currentYear - 1, currentYear, currentYear + 1]) {
    for (const h of generateHolidaysForYear(year)) {
      map.set(h.date, h);
    }
  }
  return map;
}
