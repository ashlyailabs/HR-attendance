"use client";

type Props = {
  totalEmployees: number;
  avgDailyHours: number;
  lateArrivalsCount: number;
  latePercent: number;
  earlyExitsCount: number;
};

export function KPICards({
  totalEmployees,
  avgDailyHours,
  lateArrivalsCount,
  latePercent,
  earlyExitsCount,
}: Props) {
  const latePctRounded = Math.round(latePercent);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400">
          Total Employees
        </p>
        <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-800">
          {totalEmployees}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400">
          Avg Hours / Day
        </p>
        <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-800">
          {avgDailyHours.toFixed(2)}
          <span className="text-xl font-semibold text-slate-400">h</span>
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400">
          Late Arrivals
        </p>
        <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-800">
          {lateArrivalsCount}
          <span className="text-2xl font-normal text-slate-400">
            {" "}
            · {latePctRounded}%
          </span>
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400">
          Early Exits
        </p>
        <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-800">
          {earlyExitsCount}
        </p>
      </div>
    </div>
  );
}
