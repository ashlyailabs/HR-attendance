"use client";

type Props = {
  avgDailyHours: number;
  lateArrivalsCount: number;
  latePercent: number;
  earlyExitsCount: number;
};

export function KPICards({
  avgDailyHours,
  lateArrivalsCount,
  latePercent,
  earlyExitsCount,
}: Props) {
  const latePctRounded = Math.round(latePercent);

  const card =
    "rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className={card}>
        <p className="text-xs font-medium tracking-wide text-slate-400 dark:text-slate-400">
          Avg Hours / Day
        </p>
        <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-800 dark:text-slate-100">
          {avgDailyHours.toFixed(2)}
          <span className="text-xl font-semibold text-slate-400 dark:text-slate-500">h</span>
        </p>
      </div>

      <div className={card}>
        <p className="text-xs font-medium tracking-wide text-slate-400 dark:text-slate-400">
          Late Arrivals
        </p>
        <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-800 dark:text-slate-100">
          {lateArrivalsCount}
          <span className="text-2xl font-normal text-slate-400 dark:text-slate-500">
            {" "}
            · {latePctRounded}%
          </span>
        </p>
      </div>

      <div className={card}>
        <p className="text-xs font-medium tracking-wide text-slate-400 dark:text-slate-400">
          Early Exits
        </p>
        <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-800 dark:text-slate-100">
          {earlyExitsCount}
        </p>
      </div>
    </div>
  );
}
