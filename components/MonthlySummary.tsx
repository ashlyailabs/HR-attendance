"use client";

import type { AttendanceRecord } from "@/types";
import { exportMonthlyReport } from "@/lib/exportExcel";
import {
  buildMonthlySummaryRows,
  formatYearMonthLabel,
  monthlyReportFilename,
  uniqueYearMonthsFromRecords,
} from "@/lib/monthlySummary";
import { minsToHM } from "@/lib/formatDisplay";
import { useEffect, useMemo, useState } from "react";

type Props = { records: AttendanceRecord[] };

export function MonthlySummary({ records }: Props) {
  const months = useMemo(() => uniqueYearMonthsFromRecords(records), [records]);
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  useEffect(() => {
    if (months.length === 0) {
      setSelectedMonth("");
      return;
    }
    setSelectedMonth((prev) => (prev && months.includes(prev) ? prev : months[0]));
  }, [months]);

  const rows = useMemo(
    () => (selectedMonth ? buildMonthlySummaryRows(records, selectedMonth) : []),
    [records, selectedMonth]
  );

  const handleDownload = () => {
    if (!selectedMonth || records.length === 0) return;
    const buf = exportMonthlyReport(records, selectedMonth);
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = monthlyReportFilename(selectedMonth);
    a.click();
    URL.revokeObjectURL(url);
  };

  if (records.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between dark:border-slate-700">
        <h3 className="text-sm font-semibold text-navy dark:text-slate-100">
          Monthly Summary
        </h3>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-col text-xs font-medium text-slate-600 dark:text-slate-400">
            Month
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              disabled={months.length === 0}
              className="mt-1 min-w-[160px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            >
              {months.map((m) => (
                <option key={m} value={m}>
                  {formatYearMonthLabel(m)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!selectedMonth || rows.length === 0}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
          >
            Download Monthly Report
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300">
              <th className="px-4 py-3 font-medium">Employee ID</th>
              <th className="px-4 py-3 font-medium">Employee Name</th>
              <th className="px-4 py-3 font-medium">Department</th>
              <th className="px-4 py-3 font-medium">Days Present</th>
              <th className="px-4 py-3 font-medium">Avg Hours/Day</th>
              <th className="px-4 py-3 font-medium">Late Days</th>
              <th className="px-4 py-3 font-medium">Early Exit Days</th>
              <th className="px-4 py-3 font-medium">Overtime Days</th>
              <th className="px-4 py-3 font-medium">Total Overtime</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-8 text-center text-slate-500 dark:text-slate-400"
                >
                  No rows for this month.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.employeeId}
                  className="border-b border-slate-50 bg-white dark:border-slate-700 dark:bg-slate-800"
                >
                  <td className="px-4 py-3 font-mono text-xs text-slate-800 dark:text-slate-200">
                    {row.employeeId}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                    {row.employeeName}
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                    {row.department}
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                    {row.daysPresent}
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                    {row.avgHoursPerDay}
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                    {row.lateDays}
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                    {row.earlyExitDays}
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                    {row.overtimeDays}
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                    {minsToHM(row.totalOvertimeMins)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
