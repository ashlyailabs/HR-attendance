"use client";

import type { AttendanceRecord } from "@/types";
import { isoDateToDDMMYYYY, minsToHM } from "@/lib/formatDisplay";
import { useMemo, useState } from "react";

const PAGE = 15;

function recordStatus(r: AttendanceRecord): {
  label: string;
  className: string;
} {
  const noData =
    !r.checkIn ||
    !r.checkOut ||
    r.duration === "0h 0m" ||
    (r.totalHours === 0 && r.duration.toLowerCase().includes("0h"));
  if (noData) {
    return { label: "No data", className: "bg-slate-100 text-slate-600 ring-slate-200" };
  }
  if (r.isEarlyExit) {
    return {
      label: `Left early -${minsToHM(r.earlyExitMins)}`,
      className: "bg-red-100 text-red-900 ring-red-200",
    };
  }
  if (r.isLate) {
    return {
      label: `Late +${minsToHM(r.lateMins)}`,
      className: "bg-amber-100 text-amber-900 ring-amber-200",
    };
  }
  if (r.isOvertime) {
    return {
      label: `OT +${minsToHM(r.overtimeMins)}`,
      className: "bg-emerald-100 text-emerald-900 ring-emerald-200",
    };
  }
  return { label: "On time", className: "bg-blue-100 text-blue-900 ring-blue-200" };
}

type FilterStatus = "all" | "late" | "overtime" | "nodata";

type Props = { records: AttendanceRecord[] };

export function EmployeeTable({ records }: Props) {
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const dates = useMemo(() => {
    const s = new Set(records.map((r) => r.date));
    return ["all", ...Array.from(s).sort().reverse()];
  }, [records]);

  const depts = useMemo(() => {
    const s = new Set(records.map((r) => r.department || "—"));
    return ["all", ...Array.from(s).sort()];
  }, [records]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      if (dateFilter !== "all" && r.date !== dateFilter) return false;
      const dep = r.department || "—";
      if (deptFilter !== "all" && dep !== deptFilter) return false;
      const st = recordStatus(r);
      if (statusFilter === "late" && !r.isLate) return false;
      if (statusFilter === "overtime" && !r.isOvertime) return false;
      if (statusFilter === "nodata" && st.label !== "No data") return false;
      if (q) {
        const name = r.employeeName.toLowerCase();
        const id = r.employeeId.toLowerCase();
        if (!name.includes(q) && !id.includes(q)) return false;
      }
      return true;
    });
  }, [records, dateFilter, deptFilter, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const pageSafe = Math.min(page, totalPages - 1);
  const slice = filtered.slice(pageSafe * PAGE, pageSafe * PAGE + PAGE);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-4">
        <h3 className="text-sm font-semibold text-navy">Employee records</h3>
        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
          <label className="flex flex-col text-xs font-medium text-slate-600">
            Date
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPage(0);
              }}
              className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              {dates.map((d) => (
                <option key={d} value={d}>
                  {d === "all" ? "All dates" : isoDateToDDMMYYYY(d)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-xs font-medium text-slate-600">
            Department
            <select
              value={deptFilter}
              onChange={(e) => {
                setDeptFilter(e.target.value);
                setPage(0);
              }}
              className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              {depts.map((d) => (
                <option key={d} value={d}>
                  {d === "all" ? "All departments" : d}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-xs font-medium text-slate-600">
            Status
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as FilterStatus);
                setPage(0);
              }}
              className="mt-1 min-w-[140px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="all">All</option>
              <option value="late">Late</option>
              <option value="overtime">Overtime</option>
              <option value="nodata">No Data</option>
            </select>
          </label>
          <label className="flex min-w-[200px] flex-1 flex-col text-xs font-medium text-slate-600">
            Search name or ID
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Search…"
              className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            />
          </label>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Department</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Check-In</th>
              <th className="px-4 py-3 font-medium">Check-Out</th>
              <th className="px-4 py-3 font-medium">Duration</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((r) => {
              const st = recordStatus(r);
              return (
                <tr key={`${r.employeeId}-${r.date}`} className="border-b border-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {r.employeeName}
                    <span className="mt-0.5 block text-xs font-normal text-slate-500">
                      {r.employeeId}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{r.department || "—"}</td>
                  <td className="px-4 py-3 text-slate-700">{isoDateToDDMMYYYY(r.date)}</td>
                  <td className="px-4 py-3 text-slate-700">{r.checkIn || "—"}</td>
                  <td className="px-4 py-3 text-slate-700">{r.checkOut || "—"}</td>
                  <td className="px-4 py-3 text-slate-700">{r.duration}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${st.className}`}
                    >
                      {st.label}
                    </span>
                  </td>
                  <td className="max-w-[220px] px-4 py-3 text-slate-700">
                    {r.remarks?.trim() ? (
                      <span className="text-slate-800">{r.remarks}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
        <span>
          Showing {filtered.length === 0 ? 0 : pageSafe * PAGE + 1}–
          {Math.min((pageSafe + 1) * PAGE, filtered.length)} of {filtered.length}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pageSafe <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={pageSafe >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
