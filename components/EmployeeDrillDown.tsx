"use client";

import type { AttendanceRecord } from "@/types";
import { AttendanceCalendar } from "@/components/AttendanceCalendar";
import { recordStatus } from "@/lib/attendanceRecordStatus";
import { isoDateToDDMMYYYY } from "@/lib/formatDisplay";
import { uniqueYearMonthsFromRecords } from "@/lib/monthlySummary";
import { useCallback, useEffect, useMemo, useState } from "react";

type Props = {
  open: boolean;
  employeeId: string | null;
  /** All loaded records (filtered by company on the page). */
  records: AttendanceRecord[];
  onClose: () => void;
};

export function EmployeeDrillDown({
  open,
  employeeId,
  records,
  onClose,
}: Props) {
  const empRecords = useMemo(() => {
    if (!employeeId) return [];
    return records
      .filter((r) => r.employeeId === employeeId)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [records, employeeId]);

  const meta = empRecords[empRecords.length - 1];
  const months = useMemo(() => uniqueYearMonthsFromRecords(empRecords), [empRecords]);
  const [calendarMonth, setCalendarMonth] = useState<string>("");

  useEffect(() => {
    if (!open || months.length === 0) return;
    setCalendarMonth((prev) => (prev && months.includes(prev) ? prev : months[0]));
  }, [open, months]);

  const summary = useMemo(() => {
    const n = empRecords.length;
    if (n === 0) {
      return {
        daysPresent: 0,
        avgHours: 0,
        lateDays: 0,
        earlyExitDays: 0,
        overtimeDays: 0,
      };
    }
    const totalH = empRecords.reduce((s, r) => s + r.totalHours, 0);
    return {
      daysPresent: n,
      avgHours: Math.round((totalH / n) * 100) / 100,
      lateDays: empRecords.filter((r) => r.isLate).length,
      earlyExitDays: empRecords.filter((r) => r.isEarlyExit).length,
      overtimeDays: empRecords.filter((r) => r.isOvertime).length,
    };
  }, [empRecords]);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, handleKey]);

  if (!open || !employeeId || !meta) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/50 dark:bg-black/60"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="drilldown-title"
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-600 dark:bg-slate-800"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 p-4 dark:border-slate-700">
          <div className="min-w-0">
            <h2
              id="drilldown-title"
              className="text-lg font-semibold text-slate-900 dark:text-slate-100"
            >
              {meta.employeeName}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              <span className="font-mono text-xs">{meta.employeeId}</span>
              {" · "}
              {meta.department || "—"}
              {" · "}
              {meta.designation || "—"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <Stat label="Days present" value={String(summary.daysPresent)} />
              <Stat label="Avg hours" value={String(summary.avgHours)} />
              <Stat label="Late days" value={String(summary.lateDays)} />
              <Stat label="Early exit days" value={String(summary.earlyExitDays)} />
              <Stat label="Overtime days" value={String(summary.overtimeDays)} />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
            aria-label="Close"
          >
            <span className="text-xl leading-none">×</span>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {calendarMonth && (
            <AttendanceCalendar
              employeeRecords={empRecords}
              yearMonth={calendarMonth}
              onYearMonthChange={setCalendarMonth}
            />
          )}
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
              Attendance records
            </h3>
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-600">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Check-In</th>
                    <th className="px-3 py-2 font-medium">Check-Out</th>
                    <th className="px-3 py-2 font-medium">Duration</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[...empRecords].reverse().map((r) => {
                    const st = recordStatus(r);
                    return (
                      <tr
                        key={`${r.employeeId}-${r.date}`}
                        className="border-b border-slate-50 bg-white last:border-0 dark:border-slate-700 dark:bg-slate-800"
                      >
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                          {isoDateToDDMMYYYY(r.date)}
                        </td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                          {r.checkIn || "—"}
                        </td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                          {r.checkOut || "—"}
                        </td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                          {r.duration}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${st.className}`}
                          >
                            {st.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-200">
      {label}: {value}
    </span>
  );
}
