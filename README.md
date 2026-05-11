# HR Attendance Dashboard

Next.js 14 attendance analytics dashboard. Upload daily `.xlsx` punch exports from HR software, append processed rows to Google Sheets (deduplicated by Employee ID + Date), and view live KPIs, Recharts, and a filterable employee table.

Designed to run **locally** and be reachable from other devices on the same Wi‑Fi/LAN via your computer’s IP address.

## Stack

- Next.js 14 (App Router, TypeScript)
- Tailwind CSS
- Recharts
- `xlsx` (SheetJS) for reading uploads
- `xlsx-js-style` for styled Excel export (navy headers)
- Google Sheets API via `googleapis` (service account)

---

## 1. Google Cloud project and Google Sheets API

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create a project (or select an existing one).
2. Enable **Google Sheets API**: **APIs & Services** → **Library** → search for “Google Sheets API” → **Enable**.

---

## 2. Service account, JSON key, and environment variables

1. Go to **IAM & Admin** → **Service Accounts** → **Create service account**. Choose a name (e.g. `hr-dashboard-sheets`) and finish the wizard.
2. Open the service account → **Keys** → **Add key** → **JSON**. Download the file and keep it private (do not commit it to git).
3. From the JSON file, copy:
   - **`client_email`** → this becomes `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - **`private_key`** → this becomes `GOOGLE_PRIVATE_KEY`

The private key is multi-line. In `.env.local`, use double quotes and keep `\n` as the literal backslash + `n` sequence so the key parses as one line with embedded newlines. Example:

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL="your-sa@your-project.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...(same line, use \n where JSON has newlines)...END PRIVATE KEY-----\n"
```

---

## 3. Google Sheets, sharing, and per-company Sheet IDs

The dashboard tracks **two companies** (configured in `lib/companies.ts`):

| Company | Env variable |
|---|---|
| Ashly Furniture Industries | `GOOGLE_SHEET_ID_INDUSTRIES` |
| Ashly Furnishing Co Pvt Ltd | `GOOGLE_SHEET_ID_PVT_LTD` |

For **each** company:

1. Create a **blank** Google Sheet (or use an empty first tab).
2. The app expects a tab named **`Sheet1`** (the default). Do not rename or delete it unless you change the code ranges.
3. From the URL, copy the spreadsheet ID:

   `https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit`

4. Set the corresponding env variable in `.env.local` (e.g. `GOOGLE_SHEET_ID_INDUSTRIES=<SHEET_ID>`).
5. **Share** each spreadsheet with the service account email (`GOOGLE_SERVICE_ACCOUNT_EMAIL`) with **Editor** access.

On first upload or data load for a company, the app writes the header row on row 1 if that sheet is empty.

---

## 4. Create `.env.local` in the project root

In the same folder as `package.json`, create `.env.local` with these variables filled in:

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=

# One Google Sheet ID per company.
GOOGLE_SHEET_ID_INDUSTRIES=
GOOGLE_SHEET_ID_PVT_LTD=
```

You can copy `.env.example` as a starting point (`cp .env.example .env.local`).

---

## 5. Run locally

```bash
npm install
npm run dev
```

- This project’s `dev` script binds to **all interfaces** on port **3000** (`next dev -H 0.0.0.0 -p 3000`).
- On the **host machine**, open [http://localhost:3000](http://localhost:3000).

### Input Excel layout

- Rows **1–2**: title rows (skipped).
- Row **3**: headers — Sl No, Employee ID, Employee Name, Branch, Department, Designation, Date, Time, Check-In/Out, Location, Punch Type (headers are matched flexibly).
- Row **4+**: data. Each employee-day needs an **in** and **out** row. Time may be Excel fractions or `HH:MM` strings.

---

## 6. Access from other machines on the same network

1. On the **host** machine, find its LAN IP (e.g. macOS: **System Settings → Network**; Windows: `ipconfig`; often `192.168.x.x`).
2. Ensure the firewall allows incoming connections on port **3000** if prompted.
3. On another phone/laptop on the **same Wi‑Fi/LAN**, open:

   `http://<host-local-ip>:3000`

   Example: `http://192.168.1.42:3000`

The dashboard and API calls (`/api/upload`, `/api/data`) use relative URLs, so they work when opened by hostname or IP without extra config.

---

## API

All routes require a `companyId` query parameter (`industries` or `pvt_ltd`) — see `lib/companies.ts`.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/upload?companyId=<id>` | `multipart/form-data` field `file` (`.xlsx`). Parses, dedupes, appends to the company's Sheet. Response: `{ inserted, skipped, records }`. |
| `GET` | `/api/data?companyId=<id>` | Reads the company's Sheet, returns full `DashboardData` JSON. |
| `DELETE` | `/api/reset?companyId=<id>` | Clears all data rows (keeps row 1 header) for the company. |

---

## Project structure

```
app/
  page.tsx
  layout.tsx
  globals.css
  api/upload/route.ts
  api/data/route.ts
components/
  UploadModal.tsx
  KPICards.tsx
  AttendanceOverviewChart.tsx
  EmployeeTable.tsx
lib/
  companies.ts
  processAttendance.ts
  attendanceConstants.ts
  googleSheets.ts
  exportExcel.ts
  dashboardAggregates.ts
types/
  index.ts
```
