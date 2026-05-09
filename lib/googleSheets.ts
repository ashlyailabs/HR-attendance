import { google, sheets_v4 } from "googleapis";
import type { AttendanceRecord } from "@/types";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

export const SHEET_HEADERS = [
  "Employee ID",
  "Employee Name",
  "Branch",
  "Department",
  "Designation",
  "Date",
  "Check-In",
  "Check-Out",
  "Duration",
  "Total Hours",
  "Is Late",
  "Late By (mins)",
  "Is Overtime",
  "Overtime (mins)",
  "Is Early Exit",
  "Early Exit (mins)",
] as const;

export const SHEET_COL_COUNT = SHEET_HEADERS.length;

function getPrivateKey(): string {
  const raw = process.env.GOOGLE_PRIVATE_KEY ?? "";
  return raw.replace(/\\n/g, "\n");
}

function getSheetsClient(): sheets_v4.Sheets {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = getPrivateKey();
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!clientEmail || !privateKey || !sheetId) {
    throw new Error(
      "Missing Google Sheets env: GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID"
    );
  }
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: SCOPES,
  });
  return google.sheets({ version: "v4", auth });
}

export function getSpreadsheetId(): string {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) throw new Error("GOOGLE_SHEET_ID is not set");
  return id;
}

function recordToRow(r: AttendanceRecord): (string | number | boolean)[] {
  return [
    r.employeeId,
    r.employeeName,
    r.branch,
    r.department,
    r.designation,
    r.date,
    r.checkIn,
    r.checkOut,
    r.duration,
    r.totalHours,
    r.isLate,
    r.lateMins,
    r.isOvertime,
    r.overtimeMins,
    r.isEarlyExit,
    r.earlyExitMins,
  ];
}

function parseSheetBool(v: string): boolean {
  const s = String(v).trim().toLowerCase();
  return s === "true" || s === "yes" || s === "1";
}

function rowToRecord(row: string[]): AttendanceRecord | null {
  if (row.length < 14) return null;
  const [
    employeeId,
    employeeName,
    branch,
    department,
    designation,
    date,
    checkIn,
    checkOut,
    duration,
    totalHoursRaw,
    isLateRaw,
    lateMinsRaw,
    isOvertimeRaw,
    overtimeMinsRaw,
    isEarlyExitRaw,
    earlyExitMinsRaw,
  ] = row;
  if (!employeeId?.trim() || !date?.trim()) return null;
  if (String(employeeId).trim().toLowerCase() === "employee id") return null;

  const isEarlyExit =
    row.length >= 15 ? parseSheetBool(String(isEarlyExitRaw ?? "")) : false;
  const earlyExitMins =
    row.length >= 16
      ? parseInt(String(earlyExitMinsRaw ?? "0"), 10) || 0
      : 0;

  return {
    employeeId: employeeId.trim(),
    employeeName: (employeeName ?? "").trim(),
    branch: (branch ?? "").trim(),
    department: (department ?? "").trim(),
    designation: (designation ?? "").trim(),
    date: date.trim(),
    checkIn: (checkIn ?? "").trim(),
    checkOut: (checkOut ?? "").trim(),
    duration: (duration ?? "").trim(),
    totalHours: parseFloat(String(totalHoursRaw ?? "0")) || 0,
    isLate: parseSheetBool(String(isLateRaw ?? "")),
    lateMins: parseInt(String(lateMinsRaw ?? "0"), 10) || 0,
    isOvertime: parseSheetBool(String(isOvertimeRaw ?? "")),
    overtimeMins: parseInt(String(overtimeMinsRaw ?? "0"), 10) || 0,
    isEarlyExit,
    earlyExitMins,
  };
}

/** Ensure row 1 has full header set; extends older 14-column sheets to 16 columns. */
export async function ensureHeaderRow(): Promise<void> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const range = "Sheet1!A1:P1";
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  const rows = res.data.values;
  const first = rows?.[0] ?? [];
  const nonEmpty = first.filter((c) => String(c ?? "").trim()).length;
  const needsFullHeader =
    nonEmpty === 0 || first.length < SHEET_COL_COUNT;

  if (
    !rows ||
    rows.length === 0 ||
    needsFullHeader
  ) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [SHEET_HEADERS as unknown as string[]] },
    });
  }
}

/** Read existing keys set "employeeId|date" (from row 2+). */
export async function fetchExistingKeys(): Promise<Set<string>> {
  await ensureHeaderRow();
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Sheet1!A2:P",
  });
  const values = res.data.values ?? [];
  const keys = new Set<string>();
  for (const row of values) {
    const rec = rowToRecord(row.map((c) => String(c ?? "")));
    if (rec) keys.add(`${rec.employeeId}|${rec.date}`);
  }
  return keys;
}

export async function appendRecords(
  records: AttendanceRecord[],
  existingKeys: Set<string>
): Promise<{ inserted: number; skipped: number; records: AttendanceRecord[] }> {
  if (records.length === 0) {
    return { inserted: 0, skipped: 0, records: [] };
  }
  await ensureHeaderRow();
  const toAppend: AttendanceRecord[] = [];
  let skipped = 0;
  for (const r of records) {
    const k = `${r.employeeId}|${r.date}`;
    if (existingKeys.has(k)) {
      skipped++;
      continue;
    }
    existingKeys.add(k);
    toAppend.push(r);
  }
  if (toAppend.length === 0) {
    return { inserted: 0, skipped, records: [] };
  }
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const body = toAppend.map(recordToRow);
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "Sheet1!A1",
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: body },
  });
  return { inserted: toAppend.length, skipped, records: toAppend };
}

export async function readAllRecords(): Promise<AttendanceRecord[]> {
  await ensureHeaderRow();
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Sheet1!A2:P",
  });
  const values = res.data.values ?? [];
  const out: AttendanceRecord[] = [];
  for (const row of values) {
    const rec = rowToRecord(row.map((c) => String(c ?? "")));
    if (rec) out.push(rec);
  }
  return out;
}

/** Clears all data rows on `Sheet1` (from row 2); leaves row 1 headers untouched. Returns count of non-empty data rows that were cleared. */
export async function clearAllDataRowsAfterHeader(): Promise<number> {
  await ensureHeaderRow();
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Sheet1!A2:P",
  });
  const values = res.data.values ?? [];
  const cleared = values.filter((row) =>
    row.some((c) => String(c ?? "").trim() !== "")
  ).length;

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: "Sheet1!A2:P100000",
  });
  return cleared;
}
