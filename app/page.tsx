"use client";

import { useCallback, useEffect, useState } from "react";
import type { DashboardData } from "@/types";
import { Charts } from "@/components/Charts";
import { EmployeeTable } from "@/components/EmployeeTable";
import { KPICards } from "@/components/KPICards";
import { UploadModal } from "@/components/UploadModal";
import { formatTodayDDMMYYYY } from "@/lib/formatDisplay";
import { buildDashboardExport } from "@/lib/exportExcel";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/data");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setData(json as DashboardData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleExport = () => {
    if (!data) return;
    const buf = buildDashboardExport(data);
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-report-${formatTodayDDMMYYYY()}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-navy">Attendance Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">
            {loading && "Loading…"}
            {!loading && data?.dateRangeLabel}
            {!loading && !data && !error && "No data"}
          </p>
          {error && (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-navy-dark"
          >
            Upload File
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={!data || data.records.length === 0}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export Excel
          </button>
        </div>
      </header>

      {data && (
        <>
          <KPICards
            totalEmployees={data.totalEmployees}
            avgDailyHours={data.avgDailyHours}
            latePercent={data.latePercent}
            overtimeRecordsCount={data.overtimeRecordsCount}
            earlyExitsCount={data.earlyExitsCount}
          />
          <div className="mt-8">
            <Charts data={data} />
          </div>
          <div className="mt-10">
            <EmployeeTable records={data.records} />
          </div>
        </>
      )}

      {!loading && !data && !error && (
        <p className="text-slate-600">Configure Google Sheets env and upload a file to begin.</p>
      )}

      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={() => void load()}
      />
    </div>
  );
}
