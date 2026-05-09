"use client";

import type { DashboardData } from "@/types";
import { isoDateToDDMMYYYY } from "@/lib/formatDisplay";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const DEPT_PALETTE = [
  "#1E3A5F",
  "#2563EB",
  "#0891B2",
  "#0D9488",
  "#CA8A04",
  "#C026D3",
  "#DC2626",
  "#EA580C",
];

type Props = { data: DashboardData };

export function Charts({ data }: Props) {
  const lineData = data.dailySummaries.map((d) => ({
    date: isoDateToDDMMYYYY(d.date),
    avgHours: Math.round(d.avgHours * 100) / 100,
  }));

  const headcountData = data.dailySummaries.map((d) => ({
    date: isoDateToDDMMYYYY(d.date),
    headcount: d.headcount,
  }));

  const deptData = data.deptSummaries.map((d, i) => ({
    name: d.department || "—",
    hours: Math.round(d.avgHours * 100) / 100,
    fill: DEPT_PALETTE[i % DEPT_PALETTE.length],
  }));

  const mixedData = data.dailySummaries.map((d) => ({
    date: isoDateToDDMMYYYY(d.date),
    late: d.lateCount,
    overtime: d.overtimeCount,
  }));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-navy">
          Daily average hours
        </h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#64748b" />
              <YAxis tick={{ fontSize: 11 }} stroke="#64748b" />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="avgHours"
                stroke="#1E3A5F"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-navy">Daily headcount</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={headcountData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#64748b" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#64748b" />
              <Tooltip />
              <Bar dataKey="headcount" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-navy">Avg hours by department</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={deptData}
              margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="#64748b" />
              <YAxis
                type="category"
                dataKey="name"
                width={100}
                tick={{ fontSize: 11 }}
                stroke="#64748b"
              />
              <Tooltip />
              <Bar dataKey="hours" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-navy">
          Late arrivals vs overtime (by day)
        </h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mixedData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#64748b" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#64748b" />
              <Tooltip />
              <Legend />
              <Bar dataKey="late" name="Late" fill="#D97706" radius={[4, 4, 0, 0]} />
              <Bar dataKey="overtime" name="Overtime" fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
