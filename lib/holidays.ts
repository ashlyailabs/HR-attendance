export type Holiday = {
  date: string;
  name: string;
  type: "public" | "company";
};

export const HOLIDAYS_2026: Holiday[] = [
  // Public holidays
  { date: "2026-01-26", name: "Republic Day", type: "public" },
  { date: "2026-04-02", name: "Pesaga Day", type: "public" },
  { date: "2026-04-03", name: "Good Friday", type: "public" },
  { date: "2026-05-01", name: "May Day", type: "public" },
  { date: "2026-08-15", name: "Independence Day", type: "public" },
  { date: "2026-08-26", name: "Onam", type: "public" },
  { date: "2026-08-27", name: "Onam", type: "public" },
  { date: "2026-10-02", name: "Gandhi Jayanthi", type: "public" },
  { date: "2026-12-25", name: "Christmas", type: "public" },

  // Company holidays
  { date: "2026-04-04", name: "Company Tour – Munnar", type: "company" },
  { date: "2026-04-15", name: "Vishu", type: "company" },
  { date: "2026-05-08", name: "Company Day with Family", type: "company" },
  { date: "2026-08-25", name: "Onam Celebration", type: "company" },
  { date: "2026-10-21", name: "Pooja Holiday", type: "company" },
  { date: "2026-12-24", name: "Christmas Celebration", type: "company" },
  { date: "2026-12-26", name: "Christmas Holiday", type: "company" },
];

export function getHolidayMap(): Map<string, Holiday> {
  const map = new Map<string, Holiday>();
  for (const h of HOLIDAYS_2026) map.set(h.date, h);
  return map;
}