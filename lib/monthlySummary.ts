import type { AttendanceRecord } from "@/types";

const MONTH_LABEL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const MONTH_SHORT = [
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
] as const;

/** Unique YYYY-MM values from records, newest first. */
export function uniqueYearMonthsFromRecords(records: AttendanceRecord[]): string[] {
  const set = new Set<string>();
  for (const r of records) {
    const m = r.date?.slice(0, 7);
    if (m && m.length === 7 && /^\d{4}-\d{2}$/.test(m)) set.add(m);
  }
  return [...set].sort().reverse();
}

export function formatYearMonthLabel(yyyymm: string): string {
  const [ys, ms] = yyyymm.split("-");
  const y = parseInt(ys, 10);
  const m = parseInt(ms, 10);
  if (!y || !m || m < 1 || m > 12) return yyyymm;
  return `${MONTH_LABEL[m - 1]} ${y}`;
}

export function monthlyReportFilename(yyyymm: string): string {
  const [ys, ms] = yyyymm.split("-");
  const y = parseInt(ys, 10);
  const m = parseInt(ms, 10);
  if (!y || !m || m < 1 || m > 12) return `Monthly_Report_${yyyymm}.xlsx`;
  return `Monthly_Report_${MONTH_SHORT[m - 1]}_${y}.xlsx`;
}

export type MonthlySummaryRow = {
  employeeId: string;
  employeeName: string;
  department: string;
  daysPresent: number;
  avgHoursPerDay: number;
  lateDays: number;
  earlyExitDays: number;
  overtimeDays: number;
  totalOvertimeMins: number;
};

export function buildMonthlySummaryRows(
  records: AttendanceRecord[],
  yearMonth: string
): MonthlySummaryRow[] {
  const monthRecords = records.filter((r) => r.date.startsWith(yearMonth));
  const byEmp = new Map<string, AttendanceRecord[]>();
  for (const r of monthRecords) {
    const list = byEmp.get(r.employeeId) ?? [];
    list.push(r);
    byEmp.set(r.employeeId, list);
  }

  const rows: MonthlySummaryRow[] = [];
  for (const [employeeId, list] of byEmp) {
    list.sort((a, b) => a.date.localeCompare(b.date));
    const meta = list[list.length - 1];
    const daysPresent = list.length;
    const totalH = list.reduce((s, x) => s + x.totalHours, 0);
    const avgHoursPerDay = daysPresent > 0 ? totalH / daysPresent : 0;
    const lateDays = list.filter((x) => x.isLate).length;
    const earlyExitDays = list.filter((x) => x.isEarlyExit).length;
    const overtimeDays = list.filter((x) => x.isOvertime).length;
    const totalOvertimeMins = list.reduce((s, x) => s + x.overtimeMins, 0);
    rows.push({
      employeeId,
      employeeName: meta.employeeName,
      department: meta.department || "—",
      daysPresent,
      avgHoursPerDay: Math.round(avgHoursPerDay * 100) / 100,
      lateDays,
      earlyExitDays,
      overtimeDays,
      totalOvertimeMins,
    });
  }

  rows.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  return rows;
}

/** More than 12h 25m worked (calendar "long day" blue). */
export const LONG_DAY_HOURS = 12 + 25 / 60;

export function isLongWorkDay(r: AttendanceRecord): boolean {
  return (
    Number.isFinite(r.totalHours) && r.totalHours > LONG_DAY_HOURS && !recordIsNoData(r)
  );
}

export function recordIsNoData(r: AttendanceRecord): boolean {
  return (
    !r.checkIn ||
    !r.checkOut ||
    r.duration === "0h 0m" ||
    (r.totalHours === 0 && r.duration.toLowerCase().includes("0h"))
  );
}
