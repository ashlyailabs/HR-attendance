/**
 * Static config of the companies whose attendance is tracked in this dashboard.
 *
 * Each company maps to its own Google Sheet. The `sheetEnvKey` is the
 * `.env.local` variable that holds that sheet's ID — keeping the key name
 * here means routes/services never have to hard-code env names.
 */
export const COMPANIES = [
  {
    id: "industries",
    name: "Ashly Furniture Industries",
    sheetEnvKey: "GOOGLE_SHEET_ID_INDUSTRIES",
  },
  {
    id: "pvt_ltd",
    name: "Ashly Furnishing Co Pvt Ltd",
    sheetEnvKey: "GOOGLE_SHEET_ID_PVT_LTD",
  },
] as const;

export type CompanyId = (typeof COMPANIES)[number]["id"];
export type Company = (typeof COMPANIES)[number];

export const DEFAULT_COMPANY_ID: CompanyId = COMPANIES[0].id;

export function isCompanyId(value: unknown): value is CompanyId {
  return (
    typeof value === "string" &&
    COMPANIES.some((c) => c.id === value)
  );
}

/**
 * Resolve a company config from its id. Throws if the id is unknown so
 * API routes can surface a clean 400 instead of silently falling back.
 */
export function getCompany(id: string): Company {
  const company = COMPANIES.find((c) => c.id === id);
  if (!company) {
    throw new Error(
      `Unknown companyId "${id}". Expected one of: ${COMPANIES.map((c) => c.id).join(", ")}`
    );
  }
  return company;
}

/** Resolve the Google Sheet ID for a given company id, reading from env. */
export function getSheetIdForCompany(id: string): string {
  const company = getCompany(id);
  const sheetId = process.env[company.sheetEnvKey];
  if (!sheetId || !sheetId.trim()) {
    throw new Error(
      `Missing env ${company.sheetEnvKey} for company "${company.name}"`
    );
  }
  return sheetId.trim();
}
