import XLSX from "xlsx-js-style";
import type { DashboardData } from "@/types";
import { isoDateToDDMMYYYY } from "@/lib/formatDisplay";

const NAVY = "FF1E3A5F";

function styleHeaderCell(v: string | number) {
  return {
    v,
    t: typeof v === "number" ? ("n" as const) : ("s" as const),
    s: {
      font: { bold: true, color: { rgb: "FFFFFFFF" } },
      fill: { fgColor: { rgb: NAVY } },
      alignment: { horizontal: "center", vertical: "center" },
    },
  };
}

function freezeFirstRow(ws: XLSX.WorkSheet, colCount: number) {
  ws["!views"] = [
    {
      state: "frozen" as const,
      ySplit: 1,
      xSplit: 0,
      topLeftCell: "A2",
      activeCell: "A1",
      selection: [{ sqref: `A1:${XLSX.utils.encode_col(colCount - 1)}1` }],
    },
  ];
}

function appendSheet(
  wb: XLSX.WorkBook,
  name: string,
  headers: string[],
  rows: (string | number | boolean)[][]
) {
  const headerRow = headers.map((h) => styleHeaderCell(h));
  const dataRows = rows.map((r) =>
    r.map((c) =>
      typeof c === "boolean"
        ? { v: c, t: "b" as const }
        : typeof c === "number"
          ? { v: c, t: "n" as const }
          : { v: String(c), t: "s" as const }
    )
  );
  const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
  freezeFirstRow(ws, Math.max(headers.length, 1));
  ws["!cols"] = headers.map(() => ({ wch: 16 }));
  XLSX.utils.book_append_sheet(wb, ws, name);
}

export function buildDashboardExport(data: DashboardData): ArrayBuffer {
  const {
    dateRangeLabel,
    totalEmployees,
    avgDailyHours,
    lateArrivalsCount,
    latePercent,
    overtimeRecordsCount,
    earlyExitsCount,
    records,
    dailySummaries,
    deptSummaries,
    employeeSummaries,
  } = data;

  const wb = XLSX.utils.book_new();

  const overviewHeaders = ["Metric", "Value"];
  const overviewRows: (string | number)[][] = [
    ["Date range", dateRangeLabel],
    ["Total employees (unique)", totalEmployees],
    ["Avg daily hours", Math.round(avgDailyHours * 100) / 100],
    ["Late arrivals (count)", lateArrivalsCount],
    ["Late arrivals %", Math.round(latePercent * 100) / 100],
    ["Overtime records (at/after 21:30)", overtimeRecordsCount],
    ["Early exits (before 17:30)", earlyExitsCount],
  ];
  appendSheet(wb, "Overview", overviewHeaders, overviewRows);

  const logHeaders = [
    "Employee ID",
    "Employee Name",
    "Branch",
    "Department",
    "Designation",
    "Date",
    "Check-In",
    "Check-Out",
    "Duration",
    "Total Hours",
    "Is Late",
    "Late By (mins)",
    "Is Overtime",
    "Overtime (mins)",
    "Is Early Exit",
    "Early Exit (mins)",
  ];
  const logRows = records.map((r) => [
    r.employeeId,
    r.employeeName,
    r.branch,
    r.department,
    r.designation,
    isoDateToDDMMYYYY(r.date),
    r.checkIn,
    r.checkOut,
    r.duration,
    r.totalHours,
    r.isLate,
    r.lateMins,
    r.isOvertime,
    r.overtimeMins,
    r.isEarlyExit,
    r.earlyExitMins,
  ]);
  appendSheet(wb, "Attendance Log", logHeaders, logRows);

  const dailyHeaders = [
    "Date",
    "Headcount",
    "Avg Hours",
    "Late Count",
    "Overtime Count",
    "Early Exit Count",
  ];
  const dailyRows = dailySummaries.map((d) => [
    isoDateToDDMMYYYY(d.date),
    d.headcount,
    Math.round(d.avgHours * 100) / 100,
    d.lateCount,
    d.overtimeCount,
    d.earlyExitCount,
  ]);
  appendSheet(wb, "Daily Summary", dailyHeaders, dailyRows);

  const deptHeaders = [
    "Department",
    "Unique Employees",
    "Avg Hours",
    "Late Count",
    "Overtime Count",
  ];
  const deptRows = deptSummaries.map((d) => [
    d.department,
    d.uniqueEmployees,
    Math.round(d.avgHours * 100) / 100,
    d.lateCount,
    d.overtimeCount,
  ]);
  appendSheet(wb, "Dept Summary", deptHeaders, deptRows);

  const empHeaders = [
    "Employee ID",
    "Employee Name",
    "Days Present",
    "Avg Hours",
    "Total Hours",
    "Late Days",
    "Overtime Days",
    "Early Exit Days",
    "Total Overtime (mins)",
  ];
  const empRows = employeeSummaries.map((e) => [
    e.employeeId,
    e.employeeName,
    e.daysPresent,
    Math.round(e.avgHours * 100) / 100,
    Math.round(e.totalHours * 100) / 100,
    e.lateDays,
    e.overtimeDays,
    e.earlyExitDays,
    e.totalOvertimeMins,
  ]);
  appendSheet(wb, "Employee Summary", empHeaders, empRows);

  return XLSX.write(wb, {
    type: "array",
    bookType: "xlsx",
    cellStyles: true,
  }) as ArrayBuffer;
}
