"use client";

type Props = {
  totalEmployees: number;
  avgDailyHours: number;
  latePercent: number;
  overtimeRecordsCount: number;
  earlyExitsCount: number;
};

export function KPICards({
  totalEmployees,
  avgDailyHours,
  latePercent,
  overtimeRecordsCount,
  earlyExitsCount,
}: Props) {
  const lateElevated = latePercent > 20;
  const lateSevere = latePercent > 30;

  const cards = [
    {
      label: "Total Employees",
      value: totalEmployees,
      sub: "Unique across period",
      className: "border-slate-200 bg-white",
      valueClass: "text-navy",
    },
    {
      label: "Avg Daily Hours",
      value: `${avgDailyHours.toFixed(2)}h`,
      sub: "Per employee per day (avg over records)",
      className: "border-slate-200 bg-white",
      valueClass: "text-navy",
    },
    {
      label: "Late Arrivals %",
      value: `${latePercent.toFixed(1)}%`,
      sub: "After 9:05 AM",
      className: lateSevere
        ? "border-red-300 bg-red-50"
        : lateElevated
          ? "border-amber-300 bg-amber-50"
          : "border-slate-200 bg-white",
      valueClass: lateSevere
        ? "text-red-800"
        : lateElevated
          ? "text-amber-800"
          : "text-navy",
    },
    {
      label: "Overtime Records",
      value: overtimeRecordsCount,
      sub: "Check-out after 17:30",
      className: "border-emerald-200 bg-emerald-50/80",
      valueClass: "text-emerald-800",
    },
    {
      label: "Early Exits",
      value: earlyExitsCount,
      sub: "Left before 17:30",
      className: "border-rose-200 bg-rose-50/90",
      valueClass: "text-rose-900",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`rounded-xl border p-5 shadow-sm ${c.className}`}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {c.label}
          </p>
          <p className={`mt-2 text-2xl font-semibold ${c.valueClass}`}>{c.value}</p>
          <p className="mt-1 text-xs text-slate-500">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}
