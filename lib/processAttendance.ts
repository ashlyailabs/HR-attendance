import * as XLSX from "xlsx";
import type { AttendanceRecord } from "@/types";
import {
  WORK_END_MINS,
  WORK_START_MINS,
} from "@/lib/attendanceConstants";

const LATE_THRESHOLD_MINS = WORK_START_MINS; // 09:05

const HEADER_ALIASES: Record<string, string> = {
  "sl no": "slNo",
  "employee id": "employeeId",
  "employee name": "employeeName",
  branch: "branch",
  department: "department",
  designation: "designation",
  date: "date",
  time: "time",
  "check-in/out": "inOut",
  "check-in / out": "inOut",
  location: "location",
  "punch type": "punchType",
};

function normalizeHeader(h: unknown): string | null {
  if (h == null) return null;
  const s = String(h).trim().toLowerCase().replace(/\s+/g, " ");
  return HEADER_ALIASES[s] ?? null;
}

/** Date column: Excel serial, DD-MM-YYYY, DD/MM/YYYY, or passthrough string → ISO `YYYY-MM-DD` when recognized. */
export function parseDate(raw: unknown): string {
  if (raw === null || raw === undefined || raw === "") return "";
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const n = Math.floor(raw);
    if (n === raw && n > 0 && n < 10000000) {
      const date = new Date(Math.round((n - 25569) * 86400 * 1000));
      if (!Number.isNaN(date.getTime())) {
        const d = String(date.getUTCDate()).padStart(2, "0");
        const m = String(date.getUTCMonth() + 1).padStart(2, "0");
        const y = date.getUTCFullYear();
        return `${y}-${m}-${d}`;
      }
    }
  }
  const str = String(raw).trim();

  if (/^\d{5}$/.test(str)) {
    const date = new Date(Math.round((Number(str) - 25569) * 86400 * 1000));
    const d = String(date.getUTCDate()).padStart(2, "0");
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const y = date.getUTCFullYear();
    return `${y}-${m}-${d}`;
  }

  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    const [d, m, y] = str.split("-");
    return `${y}-${m}-${d}`;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split("/");
    return `${y}-${m}-${d}`;
  }

  return str;
}

function parseDateCell(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, "0");
    const day = String(v.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  const phased = parseDate(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(phased)) return phased;
  const s = phased.trim();
  if (s === "") return null;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  const dm = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dm) {
    const day = dm[1].padStart(2, "0");
    const month = dm[2].padStart(2, "0");
    return `${dm[3]}-${month}-${day}`;
  }
  return null;
}

/** Time column: Excel day fraction, HH:MM, or passthrough string. */
export function parseTime(raw: unknown): string {
  if (raw === null || raw === undefined || raw === "") return "";
  if (typeof raw === "number" && Number.isFinite(raw)) {
    if (raw >= 0 && raw < 1) {
      const totalMins = Math.round(raw * 24 * 60);
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
    const dayFrac = raw - Math.floor(raw);
    if (dayFrac > 0 && dayFrac < 1) {
      const totalMins = Math.round(dayFrac * 24 * 60);
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
  }
  const str = String(raw).trim();
  if (/^\d{1,2}:\d{2}$/.test(str)) return str;
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(str)) {
    const [hh, mm] = str.split(":");
    return `${String(parseInt(hh, 10)).padStart(2, "0")}:${String(parseInt(mm, 10)).padStart(2, "0")}`;
  }
  const num = parseFloat(str);
  if (!isNaN(num) && num >= 0 && num < 1) {
    const totalMins = Math.round(num * 24 * 60);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  return str;
}

/** Parse "HH:MM" / "HH:MM:SS" clock → minutes from midnight. */
export function parseHHMMToMins(clock: string): number | null {
  const m = String(clock).trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const sec = m[3] ? parseInt(m[3], 10) : 0;
  if (h < 0 || h >= 24 || min < 0 || min >= 60) return null;
  return h * 60 + min + Math.round(sec / 60);
}

function formatTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatDurationMins(mins: number): string {
  if (mins <= 0 || !Number.isFinite(mins)) return "0h 0m";
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h}h ${m}m`;
}

/**
 * Re-apply attendance rules from punch strings so legacy sheet rows
 * stay in sync with the latest dashboard logic:
 *   - Late          : check-in > 09:05
 *   - Early exit    : check-out < 17:30
 *   - Overtime      : check-out >= 21:30 (i.e. > 4 hours past 17:30);
 *                     leaving between 17:30 and 21:30 is normal.
 */
export function enrichAttendanceRecord(r: AttendanceRecord): AttendanceRecord {
  const inM = parseHHMMToMins(r.checkIn);
  const outM = parseHHMMToMins(r.checkOut);
  if (inM == null || outM == null) return r;
  const durationMins = outM - inM;
  const STANDARD_SHIFT_MINS = WORK_END_MINS - WORK_START_MINS; // 505 mins
  const isLate = inM > WORK_START_MINS;
  const lateMins = isLate ? inM - WORK_START_MINS : 0;
  const isOvertime = durationMins > STANDARD_SHIFT_MINS + 240; // > 745 mins
  const overtimeMins = isOvertime ? durationMins - STANDARD_SHIFT_MINS : 0;
  const isEarlyExit = outM < WORK_END_MINS;
  const earlyExitMins = isEarlyExit ? WORK_END_MINS - outM : 0;
  return {
    ...r,
    isLate,
    lateMins,
    isOvertime,
    overtimeMins,
    isEarlyExit,
    earlyExitMins,
  };
}


type RowMap = Record<string, unknown>;

function rowToMap(headerKeys: string[], row: unknown[]): RowMap {
  const m: RowMap = {};
  headerKeys.forEach((k, i) => {
    if (k) m[k] = row[i];
  });
  return m;
}

function getInOut(row: RowMap): "in" | "out" | null {
  const raw = row.inOut ?? row.punchType;
  if (raw == null) return null;
  const s = String(raw).trim().toLowerCase();
  if (s === "in" || s === "check-in" || s === "checkin") return "in";
  if (s === "out" || s === "check-out" || s === "checkout") return "out";
  return null;
}

/** Parse uploaded xlsx buffer → processed attendance records (pairs only). */
export function processAttendanceFromBuffer(buffer: Buffer): AttendanceRecord[] {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  if (rows.length < 4) return [];

  const headerRow = rows[2] as unknown[];
  const headerKeys: string[] = [];
  headerRow.forEach((cell) => {
    const key = normalizeHeader(cell);
    headerKeys.push(key ?? "");
  });

  const idIdx = headerKeys.indexOf("employeeId");
  const dateIdx = headerKeys.indexOf("date");
  if (idIdx < 0 || dateIdx < 0) return [];

  type Punch = {
    row: RowMap;
    mins: number;
  };
  const groups = new Map<string, { punches: Punch[]; meta: RowMap }>();

  for (let r = 3; r < rows.length; r++) {
    const line = rows[r] as unknown[];
    if (!line || line.every((c) => c === "" || c == null)) continue;
    const map = rowToMap(headerKeys, line);
    const empId = String(map.employeeId ?? "").trim();

    const dateIso = parseDateCell(map.date);
    const timeStr = parseTime(map.time);
    if (!empId || !dateIso) continue;

    const io = getInOut(map);
    const timeMins = parseHHMMToMins(timeStr);
    if (!io || timeMins == null) continue;

    const normalizedRow: RowMap = { ...map, date: dateIso, time: timeStr };

    const key = `${empId}|${dateIso}`;
    let g = groups.get(key);
    if (!g) {
      g = { punches: [], meta: normalizedRow };
      groups.set(key, g);
    }
    g.punches.push({ row: normalizedRow, mins: timeMins });
  }

  const records: AttendanceRecord[] = [];

  for (const g of groups.values()) {
    const ins = g.punches.filter((p) => getInOut(p.row) === "in");
    const outs = g.punches.filter((p) => getInOut(p.row) === "out");
    if (!ins.length || !outs.length) continue;

    const inMins = Math.min(...ins.map((p) => p.mins));
    const outMins = Math.max(...outs.map((p) => p.mins));
    if (outMins <= inMins) continue;

    const durationMins = outMins - inMins;
    const meta = g.meta;
    const checkInStr = formatTime(inMins);
    const checkOutStr = formatTime(outMins);
    const totalHours = Math.round((durationMins / 60) * 100) / 100;

    const isLate = inMins > LATE_THRESHOLD_MINS;
    const lateMins = isLate ? inMins - LATE_THRESHOLD_MINS : 0;
    const STANDARD_SHIFT_MINS = WORK_END_MINS - WORK_START_MINS; // 505 mins = 8h 25m
    const isOvertime = durationMins > STANDARD_SHIFT_MINS + 240; // > 745 mins = 12h 25m
    const overtimeMins = isOvertime ? durationMins - STANDARD_SHIFT_MINS : 0;

    const isEarlyExit = outMins < WORK_END_MINS;
    const earlyExitMins = isEarlyExit ? WORK_END_MINS - outMins : 0;

    records.push({
      employeeId: String(meta.employeeId ?? "").trim(),
      employeeName: String(meta.employeeName ?? "").trim(),
      branch: String(meta.branch ?? "").trim(),
      department: String(meta.department ?? "").trim(),
      designation: String(meta.designation ?? "").trim(),
      date: typeof meta.date === "string" ? meta.date : parseDateCell(meta.date) ?? "",
      checkIn: checkInStr,
      checkOut: checkOutStr,
      duration: formatDurationMins(durationMins),
      totalHours,
      isLate,
      lateMins,
      isOvertime,
      overtimeMins,
      isEarlyExit,
      earlyExitMins,
      remarks: "",
    });
  }

  records.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.employeeId.localeCompare(b.employeeId);
  });

  return records;
}
