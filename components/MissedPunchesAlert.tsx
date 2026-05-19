"use client";

import type { MissedPunch } from "@/types";
import { isoDateToDDMMYYYY } from "@/lib/formatDisplay";
import { useMemo, useState } from "react";

type Props = {
  missedPunches: MissedPunch[];
  onDismiss: () => void;
};

function punchTypeLabel(type: MissedPunch["type"]): string {
  return type === "missing-out" ? "Missing check-out" : "Missing check-in";
}

function bannerSummary(items: MissedPunch[]): string {
  const count = items.length;
  const uniqueDates = [...new Set(items.map((p) => p.date))].sort();
  const employeeLabel = count === 1 ? "1 employee had" : `${count} employees had`;
  if (uniqueDates.length === 1) {
    return `⚠️ ${employeeLabel} incomplete punch records on ${isoDateToDDMMYYYY(uniqueDates[0])} — click to view`;
  }
  return `⚠️ ${employeeLabel} incomplete punch records across ${uniqueDates.length} dates — click to view`;
}

export function MissedPunchesAlert({ missedPunches, onDismiss }: Props) {
  const [expanded, setExpanded] = useState(false);

  const summary = useMemo(() => bannerSummary(missedPunches), [missedPunches]);

  if (missedPunches.length === 0) return null;

  return (
    <div
      className="mb-6 rounded-xl border border-amber-200 bg-amber-50 shadow-sm dark:border-amber-800/60 dark:bg-amber-950/40"
      role="region"
      aria-label="Incomplete punch records"
    >
      <div className="flex items-start gap-2 p-4">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="min-w-0 flex-1 text-left text-sm font-medium text-amber-900 hover:text-amber-950 dark:text-amber-100 dark:hover:text-amber-50"
        >
          {summary}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-md p-1 text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/50"
          aria-label="Dismiss"
        >
          <span className="text-lg leading-none">×</span>
        </button>
      </div>
      {expanded && (
        <div className="border-t border-amber-200 px-4 pb-4 pt-3 dark:border-amber-800/60">
          <div className="overflow-x-auto rounded-lg border border-amber-200/80 bg-white dark:border-amber-800/40 dark:bg-slate-900/40">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-amber-100 bg-amber-50/80 text-xs uppercase tracking-wide text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                  <th className="px-3 py-2 font-medium">Employee Name</th>
                  <th className="px-3 py-2 font-medium">Department</th>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Punch Type</th>
                  <th className="px-3 py-2 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {missedPunches.map((p) => (
                  <tr
                    key={`${p.employeeId}-${p.date}-${p.type}-${p.time}`}
                    className="border-b border-amber-50 last:border-0 dark:border-amber-900/30"
                  >
                    <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">
                      {p.employeeName}
                      <span className="mt-0.5 block text-xs font-normal text-slate-500 dark:text-slate-500">
                        {p.employeeId}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                      {p.department || "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                      {isoDateToDDMMYYYY(p.date)}
                    </td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                      {punchTypeLabel(p.type)}
                    </td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                      {p.time}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
