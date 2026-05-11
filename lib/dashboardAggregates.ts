import type {
  AttendanceRecord,
  DailySummary,
  DashboardData,
  DeptSummary,
  EmployeeSummary,
} from "@/types";
import { isoDateToDDMMYYYY } from "@/lib/formatDisplay";
import { enrichAttendanceRecord } from "@/lib/processAttendance";

/** Build dashboard aggregates from sheet records. */
export function buildDashboardData(rawRecords: AttendanceRecord[]): DashboardData {
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

  const avgDailyHours =
    n > 0 ? sorted.reduce((s, r) => s + r.totalHours, 0) / n : 0;
  const lateArrivalsCount = sorted.filter((r) => r.isLate).length;
  const latePercent = n > 0 ? (lateArrivalsCount / n) * 100 : 0;
  const overtimeRecordsCount = sorted.filter((r) => r.isOvertime).length;
  const earlyExitsCount = sorted.filter((r) => r.isEarlyExit).length;

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
          ? list.reduce((s, x) => s + x.totalHours, 0) / headcount
          : 0;
      return {
        date,
        headcount,
        avgHours,
        lateCount: list.filter((x) => x.isLate).length,
        overtimeCount: list.filter((x) => x.isOvertime).length,
        earlyExitCount: list.filter((x) => x.isEarlyExit).length,
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
          ? list.reduce((s, x) => s + x.totalHours, 0) / list.length
          : 0;
      return {
        department,
        uniqueEmployees: ids.size,
        avgHours,
        lateCount: list.filter((x) => x.isLate).length,
        overtimeCount: list.filter((x) => x.isOvertime).length,
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
      const totalHours = list.reduce((s, x) => s + x.totalHours, 0);
      const avgHours = daysPresent > 0 ? totalHours / daysPresent : 0;
      const lateDays = list.filter((x) => x.isLate).length;
      const overtimeDays = list.filter((x) => x.isOvertime).length;
      const earlyExitDays = list.filter((x) => x.isEarlyExit).length;
      const totalOvertimeMins = list.reduce((s, x) => s + x.overtimeMins, 0);
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
