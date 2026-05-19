"use client";

import { useCallback, useRef, useState } from "react";
import type { CompanyId } from "@/lib/companies";
import type { MissedPunch } from "@/types";
import { isoDateToDDMMYYYY } from "@/lib/formatDisplay";

type UploadResult = {
  inserted: number;
  skipped: number;
  missedPunches: MissedPunch[];
};

type Props = {
  open: boolean;
  companyId: CompanyId;
  companyName: string;
  onClose: () => void;
  onSuccess: (result: UploadResult) => void;
};

function punchTypeLabel(type: MissedPunch["type"]): string {
  return type === "missing-out" ? "Missing check-out" : "Missing check-in";
}

export function UploadModal({
  open,
  companyId,
  companyName,
  onClose,
  onSuccess,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [missedPunches, setMissedPunches] = useState<MissedPunch[]>([]);

  const uploadFile = useCallback(
    async (file: File) => {
      setBusy(true);
      setMessage(null);
      setMissedPunches([]);
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch(
          `/api/upload?companyId=${encodeURIComponent(companyId)}`,
          { method: "POST", body: fd }
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Upload failed");
        const punches = (json.missedPunches as MissedPunch[] | undefined) ?? [];
        setMissedPunches(punches);
        setMessage({
          type: "ok",
          text: `Inserted ${json.inserted as number}, skipped ${json.skipped as number} duplicate(s).`,
        });
        onSuccess({
          inserted: json.inserted as number,
          skipped: json.skipped as number,
          missedPunches: punches,
        });
        if (punches.length === 0) {
          setTimeout(() => {
            onClose();
            setMessage(null);
            setMissedPunches([]);
          }, 1200);
        }
      } catch (e) {
        setMessage({
          type: "err",
          text: e instanceof Error ? e.message : "Upload failed",
        });
      } finally {
        setBusy(false);
      }
    },
    [companyId, onClose, onSuccess]
  );

  const handleClose = () => {
    if (busy) return;
    setMessage(null);
    setMissedPunches([]);
    onClose();
  };

  if (!open) return null;

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.name.toLowerCase().endsWith(".xlsx")) void uploadFile(f);
    else setMessage({ type: "err", text: "Please drop a .xlsx file." });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 dark:bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
      onClick={(e) => e.target === e.currentTarget && !busy && handleClose()}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="upload-modal-title" className="text-lg font-semibold text-navy dark:text-slate-100">
          Upload attendance (.xlsx)
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Daily export from check-in software. Row 3 headers, data from row 4.
        </p>
        <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
          Uploading to:{" "}
          <span className="font-semibold text-slate-900 dark:text-slate-100">{companyName}</span>
        </p>
        <div
          onDragEnter={() => setDragOver(true)}
          onDragLeave={() => setDragOver(false)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 transition ${
            dragOver
              ? "border-navy bg-slate-50 dark:bg-slate-700/50"
              : "border-slate-200 bg-slate-50/50 dark:border-slate-600 dark:bg-slate-700/30"
          }`}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadFile(f);
              e.target.value = "";
            }}
          />
          <p className="text-center text-sm font-medium text-slate-700 dark:text-slate-300">
            Drag & drop here, or click to browse
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">.xlsx only</p>
        </div>
        {busy && (
          <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-400">Processing…</p>
        )}
        {message && (
          <p
            className={`mt-4 text-sm ${
              message.type === "ok"
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            }`}
            role="status"
          >
            {message.text}
          </p>
        )}
        {missedPunches.length > 0 && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/60 dark:bg-amber-950/40">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              ⚠️ {missedPunches.length} employee
              {missedPunches.length === 1 ? "" : "s"} have incomplete punch records:
            </p>
            <div className="mt-3 overflow-x-auto rounded-lg border border-amber-200/80 bg-white dark:border-amber-800/40 dark:bg-slate-900/40">
              <table className="min-w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-amber-100 bg-amber-50/80 text-xs uppercase tracking-wide text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                    <th className="px-2 py-2 font-medium">Employee Name</th>
                    <th className="px-2 py-2 font-medium">Department</th>
                    <th className="px-2 py-2 font-medium">Date</th>
                    <th className="px-2 py-2 font-medium">Punch Type</th>
                    <th className="px-2 py-2 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {missedPunches.map((p) => (
                    <tr
                      key={`${p.employeeId}-${p.date}-${p.type}`}
                      className="border-b border-amber-50 last:border-0 dark:border-amber-900/30"
                    >
                      <td className="px-2 py-2 text-slate-800 dark:text-slate-200">
                        {p.employeeName}
                      </td>
                      <td className="px-2 py-2 text-slate-700 dark:text-slate-300">
                        {p.department || "—"}
                      </td>
                      <td className="px-2 py-2 text-slate-700 dark:text-slate-300">
                        {isoDateToDDMMYYYY(p.date)}
                      </td>
                      <td className="px-2 py-2 text-slate-700 dark:text-slate-300">
                        {punchTypeLabel(p.type)}
                      </td>
                      <td className="px-2 py-2 text-slate-700 dark:text-slate-300">
                        {p.time}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-amber-800 dark:text-amber-200/80">
              Informational only — follow up with these employees manually.
            </p>
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={handleClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {missedPunches.length > 0 ? "Close" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
