"use client";

import type { AttendanceRecord } from "@/types";
import {
  formatYearMonthLabel,
  isLongWorkDay,
  recordIsNoData,
} from "@/lib/monthlySummary";
import { getHolidayMap, type Holiday } from "@/lib/holidays";
import { useMemo } from "react";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const holidayMap = getHolidayMap();

function toISODateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function mondayBasedWeekday(d: Date): number {
  const wd = d.getDay();
  return wd === 0 ? 6 : wd - 1;
}

export type DayKind =
  | "weekend"
  | "holiday"
  | "empty"
  | "green"
  | "amber"
  | "red"
  | "blue"
  | "outMonth";

function classifyCell(
  iso: string,
  inMonth: boolean,
  isWeekend: boolean,
  record: AttendanceRecord | undefined
): DayKind {
  if (!inMonth) return "outMonth";
  if (isWeekend) return "weekend";
  if (holidayMap.has(iso)) return "holiday";
  if (!record || recordIsNoData(record)) return "empty";
  if (isLongWorkDay(record)) return "blue";
  if (record.isEarlyExit) return "red";
  if (record.isLate) return "amber";
  return "green";
}

function cellStyles(kind: DayKind): string {
  switch (kind) {
    case "weekend":
      return "bg-[#f1f5f9] dark:bg-slate-700/90";
    case "holiday":
      return "bg-[#e9d5ff] dark:bg-purple-950/50 dark:ring-1 dark:ring-purple-800/60";
    case "empty":
      return "border-2 border-dashed border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900";
    case "green":
      return "bg-[#bbf7d0] dark:bg-emerald-950/50 dark:ring-1 dark:ring-emerald-800/60";
    case "amber":
      return "bg-[#fde68a] dark:bg-amber-950/45 dark:ring-1 dark:ring-amber-800/50";
    case "red":
      return "bg-[#fecaca] dark:bg-red-950/45 dark:ring-1 dark:ring-red-800/50";
    case "blue":
      return "bg-[#bfdbfe] dark:bg-blue-950/45 dark:ring-1 dark:ring-blue-800/50";
    case "outMonth":
      return "bg-slate-50 dark:bg-slate-800/50";
    default:
      return "";
  }
}

function dotClass(kind: DayKind): string {
  switch (kind) {
    case "green":   return "bg-emerald-600 dark:bg-emerald-400";
    case "amber":   return "bg-amber-600 dark:bg-amber-300";
    case "red":     return "bg-red-600 dark:bg-red-400";
    case "blue":    return "bg-blue-600 dark:bg-blue-400";
    case "holiday":
      return "bg-purple-600 dark:bg-purple-400";
    case "empty":   return "bg-slate-400 dark:bg-slate-500";
    case "weekend": return "bg-slate-400/70 dark:bg-slate-500";
    default:        return "bg-transparent";
  }
}

function tooltipFor(
  iso: string,
  kind: DayKind,
  record: AttendanceRecord | undefined,
  inMonth: boolean,
  isWeekend: boolean
): string | undefined {
  if (!inMonth) return undefined;
  if (isWeekend) return "Sunday";
  const holiday = holidayMap.get(iso);
  if (holiday) return `Holiday: ${holiday.name}`;
  if (kind === "empty") return "Absent / No data";
  if (!record) return undefined;
  return [
    `Check-in: ${record.checkIn || "—"}`,
    `Check-out: ${record.checkOut || "—"}`,
    `Duration: ${record.duration}`,
  ].join("\n");
}

type Props = {
  employeeRecords: AttendanceRecord[];
  yearMonth: string;
  onYearMonthChange: (ym: string) => void;
};

export function AttendanceCalendar({ employeeRecords, yearMonth, onYearMonthChange }: Props) {
  const byDate = useMemo(() => {
    const m = new Map<string, AttendanceRecord>();
    for (const r of employeeRecords) m.set(r.date, r);
    return m;
  }, [employeeRecords]);

  const [ys, ms] = yearMonth.split("-");
  const y = parseInt(ys, 10);
  const monthIndex = parseInt(ms, 10) - 1;

  const cells = useMemo(() => {
    if (!y || monthIndex < 0 || monthIndex > 11) return [];
    const first = new Date(y, monthIndex, 1);
    const offset = mondayBasedWeekday(first);
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - offset);

    const out: {
      iso: string;
      dayNum: number;
      inMonth: boolean;
      isWeekend: boolean;
      record: AttendanceRecord | undefined;
      kind: DayKind;
      holiday: Holiday | undefined;
    }[] = [];

    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      const iso = toISODateLocal(d);
      const inMonth = d.getMonth() === monthIndex;
      const dow = d.getDay();
      const isWeekend = dow === 0;
      const record = byDate.get(iso);
      const kind = classifyCell(iso, inMonth, isWeekend, record);
      out.push({ iso, dayNum: d.getDate(), inMonth, isWeekend, record, kind, holiday: holidayMap.get(iso) });
    }
    return out;
  }, [y, monthIndex, byDate]);

  const goPrev = () => {
    const d = new Date(y, monthIndex, 1);
    d.setMonth(d.getMonth() - 1);
    onYearMonthChange(toISODateLocal(d).slice(0, 7));
  };

  const goNext = () => {
    const d = new Date(y, monthIndex, 1);
    d.setMonth(d.getMonth() + 1);
    onYearMonthChange(toISODateLocal(d).slice(0, 7));
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-600 dark:bg-slate-900/40">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button type="button" onClick={goPrev} aria-label="Previous month"
          className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-sm text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
          ‹
        </button>
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {formatYearMonthLabel(yearMonth)}
        </span>
        <button type="button" onClick={goNext} aria-label="Next month"
          className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-sm text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-xs">
        {WEEKDAYS.map((w) => <div key={w} className="py-1">{w}</div>)}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((c) => {
          const tt = tooltipFor(c.iso, c.kind, c.record, c.inMonth, c.isWeekend);
          const faded = !c.inMonth;
          return (
            <div key={c.iso} title={tt}
              className={`relative flex min-h-[52px] flex-col items-center justify-start rounded-md p-1 text-xs transition ${cellStyles(c.kind)} ${faded ? "opacity-60" : ""}`}>
              <span className={`font-medium ${faded ? "text-slate-400 dark:text-slate-500" : "text-slate-800 dark:text-slate-100"}`}>
                {c.dayNum}
              </span>
              
            {c.kind === "holiday" && c.holiday && (
              <span className="mt-0.5 text-center text-[8px] leading-tight text-purple-700 line-clamp-2 dark:text-purple-300">
                {c.holiday.name}
              </span>
            )}
              {c.kind !== "outMonth" && (
                <span className={`mt-auto mb-0.5 h-1.5 w-1.5 rounded-full ${dotClass(c.kind)}`} aria-hidden />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-slate-200 pt-3 dark:border-slate-600">
        {[
          { color: "bg-[#bbf7d0] dark:bg-emerald-950/50", label: "On time" },
          { color: "bg-[#fde68a] dark:bg-amber-950/45", label: "Late arrival" },
          { color: "bg-[#fecaca] dark:bg-red-950/45", label: "Early exit" },
          { color: "bg-[#bfdbfe] dark:bg-blue-950/45", label: "Overtime" },
          { color: "bg-[#f1f5f9] dark:bg-slate-700/90", label: "Sunday" },
          { color: "border-2 border-dashed border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900", label: "Absent" },
          { color: "bg-[#e9d5ff] dark:bg-purple-950/50", label: "Holiday" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={`h-3 w-3 rounded-sm flex-shrink-0 ${color}`} />
            <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}