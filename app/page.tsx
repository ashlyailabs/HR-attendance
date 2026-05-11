"use client";

import { useCallback, useEffect, useState } from "react";
import type { DashboardData } from "@/types";
import { AttendanceOverviewChart } from "@/components/AttendanceOverviewChart";
import { EmployeeTable } from "@/components/EmployeeTable";
import { KPICards } from "@/components/KPICards";
import { UploadModal } from "@/components/UploadModal";
import { formatTodayDDMMYYYY } from "@/lib/formatDisplay";
import { buildDashboardExport } from "@/lib/exportExcel";
import {
  COMPANIES,
  DEFAULT_COMPANY_ID,
  type CompanyId,
} from "@/lib/companies";

type CompanyState = {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  /** Set once data has been fetched at least once — keeps tab switches snappy. */
  loaded: boolean;
};

const initialCompanyState = (): CompanyState => ({
  data: null,
  loading: false,
  error: null,
  loaded: false,
});

export default function DashboardPage() {
  const [activeCompany, setActiveCompany] = useState<CompanyId>(DEFAULT_COMPANY_ID);
  const [companyState, setCompanyState] = useState<Record<CompanyId, CompanyState>>(
    () =>
      COMPANIES.reduce(
        (acc, c) => {
          acc[c.id] = initialCompanyState();
          return acc;
        },
        {} as Record<CompanyId, CompanyState>
      )
  );
  const [uploadOpen, setUploadOpen] = useState(false);

  const current = companyState[activeCompany];

  const updateCompany = useCallback(
    (id: CompanyId, patch: Partial<CompanyState>) => {
      setCompanyState((prev) => ({
        ...prev,
        [id]: { ...prev[id], ...patch },
      }));
    },
    []
  );

  const loadCompany = useCallback(
    async (id: CompanyId) => {
      updateCompany(id, { loading: true, error: null });
      try {
        const res = await fetch(`/api/data?companyId=${encodeURIComponent(id)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load");
        updateCompany(id, {
          data: json as DashboardData,
          loading: false,
          loaded: true,
        });
      } catch (e) {
        updateCompany(id, {
          data: null,
          error: e instanceof Error ? e.message : "Failed to load",
          loading: false,
          loaded: true,
        });
      }
    },
    [updateCompany]
  );

  // Fetch the active company's data on first activation; cache after that.
  useEffect(() => {
    const state = companyState[activeCompany];
    if (!state.loaded && !state.loading) {
      void loadCompany(activeCompany);
    }
  }, [activeCompany, companyState, loadCompany]);

  const handleExport = () => {
    if (!current.data) return;
    const buf = buildDashboardExport(current.data);
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const companyName =
      COMPANIES.find((c) => c.id === activeCompany)?.name.replace(/\s+/g, "-") ??
      "attendance";
    a.download = `${companyName}-attendance-report-${formatTodayDDMMYYYY()}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const subtitle = current.loading
    ? "Loading…"
    : current.data?.dateRangeLabel ?? (!current.error ? "No data" : null);

  const activeCompanyName =
    COMPANIES.find((c) => c.id === activeCompany)?.name ?? "";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">
              Attendance Dashboard
            </h1>
            {subtitle && (
              <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
            )}
            {current.error && (
              <p className="mt-2 text-sm text-red-600" role="alert">
                {current.error}
              </p>
            )}
          </div>
          <div className="flex flex-shrink-0 flex-wrap gap-3 sm:justify-end">
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
            >
              Upload File
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={!current.data || current.data.records.length === 0}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Export Excel
            </button>
          </div>
        </header>

        <nav
          aria-label="Companies"
          className="mb-6 flex flex-wrap gap-1 border-b border-slate-200"
        >
          {COMPANIES.map((c) => {
            const isActive = c.id === activeCompany;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCompany(c.id)}
                aria-current={isActive ? "page" : undefined}
                className={`-mb-px rounded-t-md px-4 py-2.5 text-sm transition ${
                  isActive
                    ? "border-b-2 border-slate-800 bg-white font-semibold text-slate-900"
                    : "border-b-2 border-transparent font-medium text-slate-500 hover:text-slate-700"
                }`}
              >
                {c.name}
              </button>
            );
          })}
        </nav>

        {current.data && (
          <>
            <KPICards
              totalEmployees={current.data.totalEmployees}
              avgDailyHours={current.data.avgDailyHours}
              lateArrivalsCount={current.data.lateArrivalsCount}
              latePercent={current.data.latePercent}
              earlyExitsCount={current.data.earlyExitsCount}
            />
            <div className="mt-8">
              <AttendanceOverviewChart data={current.data} />
            </div>
            <div className="mt-8">
              <EmployeeTable records={current.data.records} />
            </div>
          </>
        )}

        {!current.loading && !current.data && !current.error && (
          <p className="text-slate-600">
            Configure Google Sheets env and upload a file to begin.
          </p>
        )}

        <UploadModal
          open={uploadOpen}
          companyId={activeCompany}
          companyName={activeCompanyName}
          onClose={() => setUploadOpen(false)}
          onSuccess={() => void loadCompany(activeCompany)}
        />
      </div>
    </div>
  );
}
