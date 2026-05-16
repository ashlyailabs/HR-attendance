import type {
  AttendanceRecord,
  DailySummary,
  DashboardData,
  DeptSummary,
  EmployeeSummary,
} from "@/types";
import { isoDateToDDMMYYYY } from "@/lib/formatDisplay";
import { getHolidayMap } from "@/lib/holidays";
import { enrichAttendanceRecord } from "@/lib/processAttendance";

function parseDurationToHours(dur: string): number {
  const match = dur.match(/(\d+)h\s*(\d+)m/);
  if (!match) return 0;
  return parseFloat((parseInt(match[1]) + parseInt(match[2]) / 60).toFixed(2));
}

function getHours(r: AttendanceRecord): number {
  return r.totalHours || parseDurationToHours(r.duration);
}

/** Build dashboard aggregates from sheet records. */
export function buildDashboardData(rawRecords: AttendanceRecord[]): DashboardData {
  const holidayMap = getHolidayMap();
  const records = rawRecords.map(enrichAttendanceRecord);
  const sorted = [...records].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.employeeName.localeCompare(b.employeeName);
  });

  const dates = sorted.map((r) => r.date).filter(Boolean);
  const minD = dates.length ? dates.reduce((a, b) => (a < b ? a : b)) : "";
  const maxD = dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : "";
  const uniqEmp = new Set(sorted.map((r) => r.employeeId));
  const n = sorted.length;

  const avgDailyHours = n > 0 ? sorted.reduce((s, r) => s + getHours(r), 0) / n : 0;
  const nonHolidayRecords = sorted.filter((r) => !holidayMap.has(r.date));
  const nKpi = nonHolidayRecords.length;
  const lateArrivalsCount = nonHolidayRecords.filter((r) => r.isLate).length;
  const latePercent = nKpi > 0 ? (lateArrivalsCount / nKpi) * 100 : 0;
  const overtimeRecordsCount = nonHolidayRecords.filter((r) => r.isOvertime).length;
  const earlyExitsCount = nonHolidayRecords.filter((r) => r.isEarlyExit).length;

  const dateRangeLabel =
    minD && maxD
      ? minD === maxD
        ? `${isoDateToDDMMYYYY(minD)} · ${uniqEmp.size} employees`
        : `${isoDateToDDMMYYYY(minD)} — ${isoDateToDDMMYYYY(maxD)} · ${uniqEmp.size} employees`
      : "No data yet · 0 employees";

  const byDay = new Map<string, AttendanceRecord[]>();
  for (const r of sorted) {
    const list = byDay.get(r.date) ?? [];
    list.push(r);
    byDay.set(r.date, list);
  }
  const dailySummaries: DailySummary[] = Array.from(byDay.keys())
    .sort()
    .map((date) => {
      const list = byDay.get(date) ?? [];
      const headcount = list.length;
      const avgHours =
        headcount > 0
          ? list.reduce((s, x) => s + getHours(x), 0) / headcount
          : 0;
      const isHoliday = holidayMap.has(date);
      return {
        date,
        headcount,
        avgHours,
        lateCount: isHoliday ? 0 : list.filter((x) => x.isLate).length,
        overtimeCount: isHoliday ? 0 : list.filter((x) => x.isOvertime).length,
        earlyExitCount: isHoliday ? 0 : list.filter((x) => x.isEarlyExit).length,
      };
    });

  const byDept = new Map<string, AttendanceRecord[]>();
  for (const r of sorted) {
    const key = r.department || "—";
    const list = byDept.get(key) ?? [];
    list.push(r);
    byDept.set(key, list);
  }
  const deptSummaries: DeptSummary[] = Array.from(byDept.keys())
    .sort()
    .map((department) => {
      const list = byDept.get(department) ?? [];
      const ids = new Set(list.map((x) => x.employeeId));
      const avgHours =
        list.length > 0
          ? list.reduce((s, x) => s + getHours(x), 0) / list.length
          : 0;
      return {
        department,
        uniqueEmployees: ids.size,
        avgHours,
        lateCount: list.filter((x) => x.isLate && !holidayMap.has(x.date)).length,
        overtimeCount: list.filter((x) => x.isOvertime && !holidayMap.has(x.date))
          .length,
      };
    });

  const byEmp = new Map<string, AttendanceRecord[]>();
  for (const r of sorted) {
    const list = byEmp.get(r.employeeId) ?? [];
    list.push(r);
    byEmp.set(r.employeeId, list);
  }
  const employeeSummaries: EmployeeSummary[] = Array.from(byEmp.entries())
    .map(([employeeId, list]) => {
      const name =
        list.find((x) => x.employeeName)?.employeeName ?? employeeId;
      const daysPresent = list.length;
      const totalHours = list.reduce((s, x) => s + getHours(x), 0);
      const avgHours = daysPresent > 0 ? totalHours / daysPresent : 0;
      const lateDays = list.filter((x) => x.isLate && !holidayMap.has(x.date)).length;
      const overtimeDays = list.filter(
        (x) => x.isOvertime && !holidayMap.has(x.date)
      ).length;
      const earlyExitDays = list.filter(
        (x) => x.isEarlyExit && !holidayMap.has(x.date)
      ).length;
      const totalOvertimeMins = list.reduce(
        (s, x) => s + (holidayMap.has(x.date) ? 0 : x.overtimeMins),
        0
      );
      return {
        employeeId,
        employeeName: name,
        daysPresent,
        avgHours,
        totalHours,
        lateDays,
        overtimeDays,
        earlyExitDays,
        totalOvertimeMins,
      };
    })
    .sort((a, b) => a.employeeName.localeCompare(b.employeeName));

  return {
    dateRangeLabel,
    totalEmployees: uniqEmp.size,
    avgDailyHours,
    lateArrivalsCount,
    latePercent,
    overtimeRecordsCount,
    earlyExitsCount,
    dailySummaries,
    deptSummaries,
    employeeSummaries,
    records: sorted,
  };
}
