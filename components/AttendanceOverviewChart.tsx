"use client";

import type { CSSProperties } from "react";
import type { DashboardData } from "@/types";
import { isoDateToDDMMYYYY } from "@/lib/formatDisplay";
import { useIsDarkMode } from "@/components/ThemeToggle";
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

type TipPayload = NonNullable<TooltipProps<number, string>["payload"]>;

function OverviewTooltip({
  active,
  payload,
  label,
  isDark,
}: {
  active?: boolean;
  payload?: TipPayload;
  label?: string | number;
  isDark: boolean;
}) {
  if (!active || !payload?.length) return null;
  const contentStyle: CSSProperties = {
    backgroundColor: isDark ? "#1e293b" : "#ffffff",
    border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
    color: isDark ? "#f1f5f9" : "#1e293b",
    borderRadius: "0.5rem",
    padding: "0.5rem 0.75rem",
    fontSize: "0.75rem",
    boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)",
  };
  const subColor = isDark ? "#94a3b8" : "#475569";
  return (
    <div style={contentStyle}>
      <p style={{ fontWeight: 600, margin: 0 }}>{label}</p>
      <ul style={{ margin: "0.375rem 0 0", padding: 0, listStyle: "none" }}>
        {payload.map((entry) => (
          <li key={String(entry.dataKey)} style={{ color: subColor }}>
            {entry.name}:{" "}
            <span style={{ color: contentStyle.color, fontVariantNumeric: "tabular-nums" }}>
              {entry.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AttendanceOverviewChart({ data }: Props) {
  const isDark = useIsDarkMode();
  const chartData: OverviewRow[] = data.dailySummaries.map((d) => ({
    dateLabel: isoDateToDDMMYYYY(d.date),
    lateArrivals: d.lateCount,
    overtime: d.overtimeCount,
    earlyExits: d.earlyExitCount,
  }));

  const gridStroke = isDark ? "#334155" : "#e2e8f0";
  const tickFill = isDark ? "#94a3b8" : "#94a3b8";
  const cursorFill = isDark ? "rgba(51, 65, 85, 0.35)" : "rgba(248, 250, 252, 0.6)";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        Attendance Overview by Day
      </h2>
      <div className="mt-4 h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 4, right: 8, left: -8, bottom: 0 }}
            barCategoryGap="18%"
          >
            <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 11, fill: tickFill }}
              tickLine={false}
              axisLine={{ stroke: gridStroke }}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: tickFill }}
              tickLine={false}
              axisLine={false}
              width={36}
            />
            <Tooltip
              content={(props) => (
                <OverviewTooltip
                  active={props.active}
                  payload={props.payload as TipPayload | undefined}
                  label={props.label}
                  isDark={isDark}
                />
              )}
              contentStyle={{
                backgroundColor: isDark ? "#1e293b" : "#ffffff",
                border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
                color: isDark ? "#f1f5f9" : "#1e293b",
              }}
              cursor={{ fill: cursorFill }}
            />
            <Bar dataKey="lateArrivals" name="Late Arrivals" fill={LATE} radius={[2, 2, 0, 0]} />
            <Bar dataKey="overtime" name="Overtime" fill={OVERTIME} radius={[2, 2, 0, 0]} />
            <Bar dataKey="earlyExits" name="Early Exits" fill={EARLY} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
