import { google, sheets_v4 } from "googleapis";
import type { AttendanceRecord } from "@/types";
import { getSheetIdForCompany } from "@/lib/companies";
import { isoDateToDDMMYYYY, normalizeToISO } from "@/lib/formatDisplay";

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
  "Is Late",
  "Late By (mins)",
  "Is Overtime",
  "Overtime (mins)",
  "Is Early Exit",
  "Early Exit (mins)",
  "Remarks",
] as const;

export const SHEET_COL_COUNT = SHEET_HEADERS.length;

/** 0-based column index → A1 column letters (0=A, 16=Q). */
function columnIndexToA1(zeroBasedIndex: number): string {
  let n = zeroBasedIndex;
  let s = "";
  while (n >= 0) {
    s = String.fromCharCode((n % 26) + 65) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

/** Last data column letter (e.g. Q for 17 columns). */
const SHEET_LAST_COL_A1 = columnIndexToA1(SHEET_COL_COUNT - 1);

/** Full Sheet1 grid used for attendance (dynamic width). */
function sheetGridRange(): string {
  return `Sheet1!A1:${SHEET_LAST_COL_A1}100000`;
}

function sheetRowRange(startRow1Based: number, rowCount: number): string {
  const endRow1Based = startRow1Based + rowCount - 1;
  return `Sheet1!A${startRow1Based}:${SHEET_LAST_COL_A1}${endRow1Based}`;
}

const NAVY_BG = hexToColor("#1E3A5F");
const HEADER_GRAY_BG = hexToColor("#F1F5F9");
const WHITE = { red: 1, green: 1, blue: 1 };
const DARK_TEXT = { red: 0.1, green: 0.1, blue: 0.1 };

/** Late By / Overtime / Early Exit minute columns (0-based). */
const MINUTES_COLUMN_INDICES = [10, 12, 14] as const;

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

/** Every row sent to `values.update` must be exactly `SHEET_COL_COUNT` wide so column A stays aligned. */
function fixedRow(
  cells: (string | number | boolean)[]
): (string | number | boolean)[] {
  const out: (string | number | boolean)[] = [];
  for (let i = 0; i < SHEET_COL_COUNT; i++) {
    out.push(i < cells.length ? cells[i] : "");
  }
  return out;
}

/** Date banner: human-readable date in column A only; full-width navy styling applied via repeatCell. */
function dateBannerRow(displayDateLabel: string): (string | number | boolean)[] {
  return fixedRow([displayDateLabel]);
}

function blankRow(): (string | number | boolean)[] {
  return fixedRow([]);
}

/** Column labels row after each date banner. */
function columnHeaderRow(): (string | number | boolean)[] {
  return fixedRow([...SHEET_HEADERS]);
}

function filledCellCount(row: string[]): number {
  return row.filter((c) => String(c).trim() !== "").length;
}

/**
 * Data rows only: real employee punches. Skips blank rows, date banners,
 * header label row, and sparse rows (< 3 filled cells).
 */
function isDataRow(padded: string[]): boolean {
  const empId = padded[0]?.trim() ?? "";
  if (!empId) return false;
  if (empId.toLowerCase() === "employee id") return false;
  if (filledCellCount(padded) < 3) return false;
  // Date banner: "06 May 2026" in column A
  if (/^\d{2}\s[A-Za-z]{3}\s\d{4}$/.test(empId)) return false;
  if (/^\d{4}-\d{2}-\d{2}$/.test(empId)) return false; // "2026-05-01"
  if (/^\d{2}-\d{2}-\d{4}$/.test(empId)) return false; // "01-05-2026"
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(empId)) return false; // "01/05/2026"
  return true;
}

/** Sheet row for **new** inserts only; Remarks is always blank so HR notes persist on the sheet and are never overwritten by upload. */
function recordToRowForAppend(_r: AttendanceRecord): (string | number | boolean)[] {
  const dateIso = normalizeToISO(_r.date);
  return fixedRow([
    _r.employeeId,
    _r.employeeName,
    _r.branch,
    _r.department,
    _r.designation,
    dateIso,
    _r.checkIn,
    _r.checkOut,
    _r.duration,
    _r.isLate,
    _r.lateMins,
    _r.isOvertime,
    _r.overtimeMins,
    _r.isEarlyExit,
    _r.earlyExitMins,
    "",
  ]);
}
function parseDurationToHours(dur: string): number {
  const match = dur.match(/(\d+)h\s*(\d+)m/);
  if (!match) return 0;
  return parseFloat((parseInt(match[1]) + parseInt(match[2]) / 60).toFixed(2));
}

function parseSheetBool(v: string): boolean {
  const s = String(v).trim().toLowerCase();
  return s === "true" || s === "yes" || s === "1";
}

function rowToRecord(row: string[]): AttendanceRecord | null {
  if (row.length < 13) return null;
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

  const remarks =
    row.length > 16 ? String(row[16] ?? "").trim() : "";

  const dateIso = normalizeToISO(String(date ?? "").trim());
  return {
    employeeId: employeeId.trim(),
    employeeName: (employeeName ?? "").trim(),
    branch: (branch ?? "").trim(),
    department: (department ?? "").trim(),
    designation: (designation ?? "").trim(),
    date: dateIso,
    checkIn: (checkIn ?? "").trim(),
    checkOut: (checkOut ?? "").trim(),
    duration: (duration ?? "").trim(),
    totalHours: parseDurationToHours((duration ?? "").trim()),
    isLate: parseSheetBool(String(isLateRaw ?? "")),
    lateMins: parseInt(String(lateMinsRaw ?? "0"), 10) || 0,
    isOvertime: parseSheetBool(String(isOvertimeRaw ?? "")),
    overtimeMins: parseInt(String(overtimeMinsRaw ?? "0"), 10) || 0,
    isEarlyExit,
    earlyExitMins,
    remarks,
  };
}

async function getAllValueRows(companyId: string): Promise<string[][]> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId(companyId);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetGridRange(),
  });
  const values = res.data.values ?? [];
  return values
    .filter((row) => (row as unknown[]).some((c) => String(c ?? "").trim() !== ""))
    .map((row) => padRow(row, SHEET_COL_COUNT));
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
      keys.add(`${rec.employeeId}|${normalizeToISO(rec.date)}`);
      dates.add(normalizeToISO(rec.date));
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

function buildStyledAppendPayload(params: {
  toAppend: AttendanceRecord[];
  existingDates: Set<string>;
}): {
  valueRows: (string | number | boolean)[][];
  rowKinds: AppendRowKind[];
} {
  const { toAppend, existingDates } = params;
  const byDate = new Map<string, AttendanceRecord[]>();
  for (const r of toAppend) {
    const list = byDate.get(r.date) ?? [];
    list.push(r);
    byDate.set(r.date, list);
  }
  const sortedDates = [...byDate.keys()].sort();

  const valueRows: (string | number | boolean)[][] = [];
  const rowKinds: AppendRowKind[] = [];

  const datesInSheet = new Set(existingDates);

  for (let i = 0; i < sortedDates.length; i++) {
    const isoDate = sortedDates[i];
    const list = byDate.get(isoDate);
    if (!list) continue;

    const isNewDateOnSheet = !datesInSheet.has(isoDate);
    if (isNewDateOnSheet) {
      if (valueRows.length > 0) {
        valueRows.push(blankRow());
        rowKinds.push("blank");
      }
      const label = isoDateToDDMMYYYY(isoDate);
      valueRows.push(dateBannerRow(label));
      rowKinds.push("date");
      valueRows.push(columnHeaderRow());
      rowKinds.push("header");
      datesInSheet.add(isoDate);
    }

    for (const rec of list) {
      valueRows.push(recordToRowForAppend(rec));
      rowKinds.push("data");
    }
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

function rowIndicesByKind(
  startRow1Based: number,
  rowKinds: AppendRowKind[]
): Map<AppendRowKind, number[]> {
  const byKind = new Map<AppendRowKind, number[]>();
  for (let i = 0; i < rowKinds.length; i++) {
    const kind = rowKinds[i];
    const row0 = startRow1Based - 1 + i;
    const list = byKind.get(kind) ?? [];
    list.push(row0);
    byKind.set(kind, list);
  }
  return byKind;
}

function repeatCellForRowRange(
  sheetId: number,
  rowIndices: number[],
  format: sheets_v4.Schema$CellFormat,
  fields: string
): sheets_v4.Schema$Request | null {
  if (rowIndices.length === 0) return null;
  const startRow0 = Math.min(...rowIndices);
  const endRow0Exclusive = Math.max(...rowIndices) + 1;
  return repeatCell(
    sheetId,
    startRow0,
    endRow0Exclusive,
    0,
    SHEET_COL_COUNT,
    format,
    fields
  );
}

/** Force minute columns to plain numbers (not dates) across the sheet. */
function numericMinutesColumnFormatRequests(
  sheetId: number
): sheets_v4.Schema$Request[] {
  return MINUTES_COLUMN_INDICES.map((startColumnIndex) => ({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 0,
        endRowIndex: 100000,
        startColumnIndex,
        endColumnIndex: startColumnIndex + 1,
      },
      cell: {
        userEnteredFormat: {
          numberFormat: { type: "NUMBER", pattern: "0" },
        },
      },
      fields: "userEnteredFormat.numberFormat",
    },
  }));
}

function buildFormatRequests(
  sheetId: number,
  startRow1Based: number,
  rowKinds: AppendRowKind[]
): sheets_v4.Schema$Request[] {
  const byKind = rowIndicesByKind(startRow1Based, rowKinds);
  const repeatRequests: sheets_v4.Schema$Request[] = [];

  const blankReq = repeatCellForRowRange(
    sheetId,
    byKind.get("blank") ?? [],
    {
      backgroundColor: WHITE,
      horizontalAlignment: "CENTER",
      textFormat: { foregroundColor: DARK_TEXT },
    },
    "userEnteredFormat.backgroundColor,userEnteredFormat.horizontalAlignment,userEnteredFormat.textFormat"
  );
  if (blankReq) repeatRequests.push(blankReq);

  const dateReq = repeatCellForRowRange(
    sheetId,
    byKind.get("date") ?? [],
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
  );
  if (dateReq) repeatRequests.push(dateReq);

  const headerReq = repeatCellForRowRange(
    sheetId,
    byKind.get("header") ?? [],
    {
      backgroundColor: HEADER_GRAY_BG,
      horizontalAlignment: "CENTER",
      textFormat: {
        bold: true,
        fontSize: 11,
        foregroundColor: DARK_TEXT,
      },
    },
    "userEnteredFormat.backgroundColor,userEnteredFormat.horizontalAlignment,userEnteredFormat.textFormat"
  );
  if (headerReq) repeatRequests.push(headerReq);

  const dataReq = repeatCellForRowRange(
    sheetId,
    byKind.get("data") ?? [],
    {
      backgroundColor: WHITE,
      horizontalAlignment: "CENTER",
      textFormat: {
        bold: false,
        fontSize: 10,
        foregroundColor: DARK_TEXT,
      },
    },
    "userEnteredFormat.backgroundColor,userEnteredFormat.horizontalAlignment,userEnteredFormat.textFormat"
  );
  if (dataReq) repeatRequests.push(dataReq);

  return repeatRequests;
}

/** Normalize grid range for batch ops (sheetId required for unmerge). */
function withSheetId(
  m: sheets_v4.Schema$GridRange,
  sheetId: number
): sheets_v4.Schema$GridRange {
  return { ...m, sheetId: m.sheetId ?? sheetId };
}

async function unmergeAllMergedRegions(
  spreadsheetId: string,
  sheetId: number
): Promise<void> {
  const sheets = getSheetsClient();
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties.sheetId,merges)",
  });
  const sheet = meta.data.sheets?.find((s) => s.properties?.sheetId === sheetId);
  const merges = sheet?.merges ?? [];
  if (merges.length === 0) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: merges.map((m) => ({
        unmergeCells: { range: withSheetId(m, sheetId) },
      })),
    },
  });
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
    const dateIso = normalizeToISO(r.date);
    const k = `${r.employeeId}|${dateIso}`;
    if (keys.has(k)) {
      skipped++;
      continue;
    }
    keys.add(k);
    toAppend.push(dateIso === r.date ? r : { ...r, date: dateIso });
  }
  if (toAppend.length === 0) {
    return { inserted: 0, skipped, records: [] };
  }

  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId(companyId);
  const sheetId = await getSheet1Id(spreadsheetId);

  const gridRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetGridRange(),
  });
  const rawRows = gridRes.data.values ?? [];
  const lastNonEmptyRow = rawRows.reduce((last, row, idx) => {
    const hasContent = (row as unknown[]).some((c) => String(c ?? "").trim() !== "");
    return hasContent ? idx + 1 : last;
  }, 0);
  const startRow1Based = lastNonEmptyRow + 1;

  const { valueRows, rowKinds } = buildStyledAppendPayload({
    toAppend,
    existingDates: dates,
  });

  valueRows.forEach((row, idx) => {
    if (
      rowKinds[idx] === "data" &&
      !row.some((c) => String(c ?? "").trim() !== "")
    ) {
      console.log(
        "BLANK DATA ROW at index:",
        idx,
        "prev:",
        valueRows[idx - 1]?.[0],
        "next:",
        valueRows[idx + 1]?.[0]
      );
    }
  });

  const safeValueRows = valueRows.filter((row, idx) => {
    if (rowKinds[idx] !== "data") return true;
    return row.some((cell) => String(cell ?? "").trim() !== "");
  });
  const safeRowKinds = rowKinds.filter((_, idx) => {
    if (rowKinds[idx] !== "data") return true;
    return valueRows[idx].some((cell) => String(cell ?? "").trim() !== "");
  });

  const rowCount = safeValueRows.length;

  const range = sheetRowRange(startRow1Based, rowCount);
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "RAW",
    requestBody: { values: safeValueRows },
  });

  const formatRequests = [
    ...buildFormatRequests(sheetId, startRow1Based, safeRowKinds),
    ...numericMinutesColumnFormatRequests(sheetId),
  ];

  if (formatRequests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: formatRequests,
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

/** Clears all values in Sheet1 (full width) and removes merged regions so the tab is empty for the next upload. */
export async function clearAllDataRowsAfterHeader(companyId: string): Promise<number> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId(companyId);
  const sheetId = await getSheet1Id(spreadsheetId);

  const values = await getAllValueRows(companyId);
  const cleared = values.filter((row) =>
    row.some((c) => String(c ?? "").trim() !== "")
  ).length;

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: sheetGridRange(),
  });

  await unmergeAllMergedRegions(spreadsheetId, sheetId);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          updateSheetProperties: {
            properties: {
              sheetId,
              gridProperties: {
                frozenColumnCount: 2,
              },
            },
            fields: "gridProperties.frozenColumnCount",
          },
        },
        ...numericMinutesColumnFormatRequests(sheetId),
      ],
    },
  });

  return cleared;
}
