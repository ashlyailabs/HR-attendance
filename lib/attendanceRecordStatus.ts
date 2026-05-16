import type { AttendanceRecord } from "@/types";
import { minsToHM } from "@/lib/formatDisplay";

export function recordStatus(r: AttendanceRecord): {
  label: string;
  className: string;
} {
  const noData =
    !r.checkIn ||
    !r.checkOut ||
    r.duration === "0h 0m" ||
    (r.totalHours === 0 && r.duration.toLowerCase().includes("0h"));
  if (noData) {
    return {
      label: "No data",
      className:
        "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:ring-slate-600",
    };
  }
  if (r.isEarlyExit) {
    return {
      label: `Left early -${minsToHM(r.earlyExitMins)}`,
      className:
        "bg-red-100 text-red-900 ring-red-200 dark:bg-red-950/80 dark:text-red-200 dark:ring-red-800",
    };
  }
  if (r.isLate) {
    return {
      label: `Late +${minsToHM(r.lateMins)}`,
      className:
        "bg-amber-100 text-amber-900 ring-amber-200 dark:bg-amber-950/80 dark:text-amber-200 dark:ring-amber-800",
    };
  }
  if (r.isOvertime) {
    return {
      label: `OT +${minsToHM(r.overtimeMins)}`,
      className:
        "bg-emerald-100 text-emerald-900 ring-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-200 dark:ring-emerald-800",
    };
  }
  return {
    label: "On time",
    className:
      "bg-blue-100 text-blue-900 ring-blue-200 dark:bg-blue-950/80 dark:text-blue-200 dark:ring-blue-800",
  };
}
