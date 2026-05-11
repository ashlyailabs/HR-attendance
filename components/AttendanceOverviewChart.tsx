"use client";

import type { DashboardData } from "@/types";
import { isoDateToDDMMYYYY } from "@/lib/formatDisplay";
import type { TooltipProps } from "recharts";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const LATE = "#D97706";
const OVERTIME = "#059669";
const EARLY = "#DC2626";

type OverviewRow = {
  dateLabel: string;
  lateArrivals: number;
  overtime: number;
  earlyExits: number;
};

type Props = { data: DashboardData };

function OverviewTooltip({
  active,
  payload,
  label,
}: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="font-medium text-slate-800">{label}</p>
      <ul className="mt-1.5 space-y-0.5 text-slate-600">
        {payload.map((entry) => (
          <li key={String(entry.dataKey)}>
            {entry.name}: <span className="tabular-nums text-slate-800">{entry.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AttendanceOverviewChart({ data }: Props) {
  const chartData: OverviewRow[] = data.dailySummaries.map((d) => ({
    dateLabel: isoDateToDDMMYYYY(d.date),
    lateArrivals: d.lateCount,
    overtime: d.overtimeCount,
    earlyExits: d.earlyExitCount,
  }));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-800">
        Attendance Overview by Day
      </h2>
      <div className="mt-4 h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 4, right: 8, left: -8, bottom: 0 }}
            barCategoryGap="18%"
          >
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={{ stroke: "#e2e8f0" }}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
              width={36}
            />
            <Tooltip content={<OverviewTooltip />} cursor={{ fill: "rgba(248, 250, 252, 0.6)" }} />
            <Bar dataKey="lateArrivals" name="Late Arrivals" fill={LATE} radius={[2, 2, 0, 0]} />
            <Bar dataKey="overtime" name="Overtime" fill={OVERTIME} radius={[2, 2, 0, 0]} />
            <Bar dataKey="earlyExits" name="Early Exits" fill={EARLY} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
