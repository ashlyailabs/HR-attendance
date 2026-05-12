import { google, sheets_v4 } from "googleapis";
import type { AttendanceRecord } from "@/types";
import { getSheetIdForCompany } from "@/lib/companies";
import { isoDateToDDMMYYYY } from "@/lib/formatDisplay";

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

const NAVY_BG = hexToColor("#1E3A5F");
const HEADER_GRAY_BG = hexToColor("#F1F5F9");
const DATA_ALT_BG = hexToColor("#F8FAFC");
const WHITE = { red: 1, green: 1, blue: 1 };

function hexToColor(hex: string): sheets_v4.Schema$Color {
  const n = hex.replace("#", "");
  return {
    red: parseInt(n.slice(0, 2), 16) / 255,
    green: parseInt(n.slice(2, 4), 16) / 255,
    blue: parseInt(n.slice(4, 6), 16) / 255,
  };
}

function getPrivateKey(): string {
  const raw = process.env.GOOGLE_PRIVATE_KEY ?? "";
  return raw.replace(/\\n/g, "\n");
}

function getSheetsClient(): sheets_v4.Sheets {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = getPrivateKey();
  if (!clientEmail || !privateKey) {
    throw new Error(
      "Missing Google Sheets env: GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY"
    );
  }
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: SCOPES,
  });
  return google.sheets({ version: "v4", auth });
}

/** Resolve the spreadsheet ID for the given company. */
export function getSpreadsheetId(companyId: string): string {
  return getSheetIdForCompany(companyId);
}

async function getSheet1Id(spreadsheetId: string): Promise<number> {
  const sheets = getSheetsClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sh = meta.data.sheets?.find((s) => s.properties?.title === "Sheet1");
  const id = sh?.properties?.sheetId;
  if (id == null) throw new Error('Spreadsheet has no tab named "Sheet1".');
  return id;
}

function padRow(row: unknown[], len: number): string[] {
  const out = row.map((c) => String(c ?? ""));
  while (out.length < len) out.push("");
  return out.slice(0, len);
}

function filledCellCount(row: string[]): number {
  return row.filter((c) => String(c).trim() !== "").length;
}

/**
 * Data rows only: real employee punches. Skips blank rows, date banners,
 * subheader rows, and sparse rows (< 3 filled cells).
 */
function isDataRow(padded: string[]): boolean {
  const empId = padded[0]?.trim() ?? "";
  if (!empId) return false;
  if (empId.toLowerCase() === "employee id") return false;
  if (filledCellCount(padded) < 3) return false;
  return true;
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

async function getAllValueRows(companyId: string): Promise<string[][]> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId(companyId);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Sheet1!A1:P100000",
  });
  const values = res.data.values ?? [];
  return values.map((row) => padRow(row, SHEET_COL_COUNT));
}

function scanSheetForKeysAndDates(values: string[][]): {
  keys: Set<string>;
  dates: Set<string>;
} {
  const keys = new Set<string>();
  const dates = new Set<string>();
  for (const row of values) {
    const padded = padRow(row, SHEET_COL_COUNT);
    if (!isDataRow(padded)) continue;
    const rec = rowToRecord(padded);
    if (rec) {
      keys.add(`${rec.employeeId}|${rec.date}`);
      dates.add(rec.date);
    }
  }
  return { keys, dates };
}

/** Keys and ISO dates found only on real data rows (ignores banners/headers). */
export async function fetchExistingKeysAndDates(
  companyId: string
): Promise<{ keys: Set<string>; dates: Set<string> }> {
  const values = await getAllValueRows(companyId);
  return scanSheetForKeysAndDates(values);
}

/** Employee+date keys only; use `fetchExistingKeysAndDates` when appending. */
export async function fetchExistingKeys(companyId: string): Promise<Set<string>> {
  const { keys } = await fetchExistingKeysAndDates(companyId);
  return keys;
}

type AppendRowKind = "blank" | "date" | "header" | "data";

function emptyRow(): string[] {
  return Array.from({ length: SHEET_COL_COUNT }, () => "");
}

function valuesRowFromRecord(
  r: (string | number | boolean)[]
): (string | number | boolean)[] {
  const row = [...r];
  while (row.length < SHEET_COL_COUNT) row.push("");
  return row.slice(0, SHEET_COL_COUNT);
}

function buildStyledAppendPayload(params: {
  toAppend: AttendanceRecord[];
  existingDates: Set<string>;
  startRow1Based: number;
}): {
  valueRows: (string | number | boolean)[][];
  rowKinds: AppendRowKind[];
} {
  const { toAppend, existingDates, startRow1Based } = params;
  const byDate = new Map<string, AttendanceRecord[]>();
  for (const r of toAppend) {
    const list = byDate.get(r.date) ?? [];
    list.push(r);
    byDate.set(r.date, list);
  }
  const sortedDates = [...byDate.keys()].sort();

  const valueRows: (string | number | boolean)[][] = [];
  const rowKinds: AppendRowKind[] = [];
  let wroteAnyInThisAppend = false;

  const datesInSheet = new Set(existingDates);

  for (const isoDate of sortedDates) {
    const list = byDate.get(isoDate);
    if (!list) continue;
    const needDayBlock = !datesInSheet.has(isoDate);
    if (needDayBlock) {
      if (startRow1Based > 1 || wroteAnyInThisAppend) {
        valueRows.push(emptyRow());
        rowKinds.push("blank");
      }
      const label = isoDateToDDMMYYYY(isoDate);
      const dateRow: (string | number | boolean)[] = emptyRow();
      dateRow[0] = label;
      valueRows.push(valuesRowFromRecord(dateRow));
      rowKinds.push("date");
      valueRows.push(valuesRowFromRecord([...SHEET_HEADERS]));
      rowKinds.push("header");
      datesInSheet.add(isoDate);
    }
    for (const rec of list) {
      valueRows.push(valuesRowFromRecord(recordToRow(rec)));
      rowKinds.push("data");
    }
    wroteAnyInThisAppend = true;
  }

  return { valueRows, rowKinds };
}

function repeatCell(
  sheetId: number,
  startRow0: number,
  endRow0Exclusive: number,
  startCol0: number,
  endCol0Exclusive: number,
  format: sheets_v4.Schema$CellFormat,
  fields: string
): sheets_v4.Schema$Request {
  return {
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: startRow0,
        endRowIndex: endRow0Exclusive,
        startColumnIndex: startCol0,
        endColumnIndex: endCol0Exclusive,
      },
      cell: { userEnteredFormat: format },
      fields,
    },
  };
}

function buildFormatRequests(
  sheetId: number,
  startRow1Based: number,
  rowKinds: AppendRowKind[]
): {
  mergeRequests: sheets_v4.Schema$Request[];
  repeatRequests: sheets_v4.Schema$Request[];
} {
  const mergeRequests: sheets_v4.Schema$Request[] = [];
  const repeatRequests: sheets_v4.Schema$Request[] = [];

  let dataStripeIndex = 0;

  for (let i = 0; i < rowKinds.length; i++) {
    const kind = rowKinds[i];
    const row0 = startRow1Based - 1 + i;

    if (kind === "date") {
      mergeRequests.push({
        mergeCells: {
          range: {
            sheetId,
            startRowIndex: row0,
            endRowIndex: row0 + 1,
            startColumnIndex: 0,
            endColumnIndex: SHEET_COL_COUNT,
          },
          mergeType: "MERGE_ALL",
        },
      });
      repeatRequests.push(
        repeatCell(
          sheetId,
          row0,
          row0 + 1,
          0,
          SHEET_COL_COUNT,
          {
            backgroundColor: NAVY_BG,
            horizontalAlignment: "CENTER",
            textFormat: {
              foregroundColor: WHITE,
              bold: true,
              fontSize: 12,
            },
          },
          "userEnteredFormat.backgroundColor,userEnteredFormat.horizontalAlignment,userEnteredFormat.textFormat"
        )
      );
    } else if (kind === "header") {
      repeatRequests.push(
        repeatCell(
          sheetId,
          row0,
          row0 + 1,
          0,
          SHEET_COL_COUNT,
          {
            backgroundColor: HEADER_GRAY_BG,
            textFormat: {
              bold: true,
              fontSize: 11,
            },
          },
          "userEnteredFormat.backgroundColor,userEnteredFormat.textFormat"
        )
      );
    } else if (kind === "data") {
      const bg = dataStripeIndex % 2 === 0 ? WHITE : DATA_ALT_BG;
      dataStripeIndex++;
      repeatRequests.push(
        repeatCell(
          sheetId,
          row0,
          row0 + 1,
          0,
          SHEET_COL_COUNT,
          { backgroundColor: bg },
          "userEnteredFormat.backgroundColor"
        )
      );
    } else {
      repeatRequests.push(
        repeatCell(
          sheetId,
          row0,
          row0 + 1,
          0,
          SHEET_COL_COUNT,
          { backgroundColor: WHITE },
          "userEnteredFormat.backgroundColor"
        )
      );
    }
  }

  return { mergeRequests, repeatRequests };
}

export async function appendRecords(
  companyId: string,
  records: AttendanceRecord[],
  existingKeys: Set<string>,
  existingDates: Set<string>
): Promise<{ inserted: number; skipped: number; records: AttendanceRecord[] }> {
  if (records.length === 0) {
    return { inserted: 0, skipped: 0, records: [] };
  }

  const keys = new Set(existingKeys);
  const dates = new Set(existingDates);

  const toAppend: AttendanceRecord[] = [];
  let skipped = 0;
  for (const r of records) {
    const k = `${r.employeeId}|${r.date}`;
    if (keys.has(k)) {
      skipped++;
      continue;
    }
    keys.add(k);
    toAppend.push(r);
  }
  if (toAppend.length === 0) {
    return { inserted: 0, skipped, records: [] };
  }

  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId(companyId);
  const valueMatrix = await getAllValueRows(companyId);
  const startRow1Based = valueMatrix.length + 1;

  const { valueRows, rowKinds } = buildStyledAppendPayload({
    toAppend,
    existingDates: dates,
    startRow1Based,
  });

  const endRow = startRow1Based + valueRows.length - 1;
  const range = `Sheet1!A${startRow1Based}:P${endRow}`;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: valueRows },
  });

  const sheetId = await getSheet1Id(spreadsheetId);
  const { mergeRequests, repeatRequests } = buildFormatRequests(
    sheetId,
    startRow1Based,
    rowKinds
  );

  if (mergeRequests.length > 0 || repeatRequests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [...mergeRequests, ...repeatRequests],
      },
    });
  }

  return { inserted: toAppend.length, skipped, records: toAppend };
}

export async function readAllRecords(companyId: string): Promise<AttendanceRecord[]> {
  const values = await getAllValueRows(companyId);
  const out: AttendanceRecord[] = [];
  for (const row of values) {
    const padded = padRow(row, SHEET_COL_COUNT);
    if (!isDataRow(padded)) continue;
    const rec = rowToRecord(padded);
    if (rec) out.push(rec);
  }
  return out;
}

/** Clears all values in Sheet1 (A1:P). Does not rely on a legacy single header row. */
export async function clearAllDataRowsAfterHeader(companyId: string): Promise<number> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId(companyId);
  const values = await getAllValueRows(companyId);
  const cleared = values.filter((row) =>
    row.some((c) => String(c ?? "").trim() !== "")
  ).length;

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: "Sheet1!A1:P100000",
  });

  return cleared;
}
