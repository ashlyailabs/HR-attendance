import { NextRequest, NextResponse } from "next/server";
import { clearAllDataRowsAfterHeader } from "@/lib/googleSheets";
import { isCompanyId } from "@/lib/companies";

export const dynamic = "force-dynamic";

/**
 * One-time: wipe all Sheet1 values (A1:Q) for the given company. Requires
 * `CLEAR_SHEET_TOKEN` in `.env.local` matching the JSON body
 * `{ "token": "..." }`. The target company is specified via
 * `?companyId=industries|pvt_ltd`.
 */
export async function POST(request: NextRequest) {
  const expected = process.env.CLEAR_SHEET_TOKEN?.trim();
  if (!expected) {
    return NextResponse.json(
      { error: "Set CLEAR_SHEET_TOKEN in .env.local to use this endpoint." },
      { status: 503 }
    );
  }
  const companyId = request.nextUrl.searchParams.get("companyId");
  if (!companyId || !isCompanyId(companyId)) {
    return NextResponse.json(
      { error: "Missing or invalid companyId query parameter" },
      { status: 400 }
    );
  }
  let body: { token?: string } = {};
  try {
    body = (await request.json()) as { token?: string };
  } catch {
    /* empty body */
  }
  if (body.token !== expected) {
    return NextResponse.json({ error: "Invalid or missing token." }, { status: 401 });
  }
  try {
    const cleared = await clearAllDataRowsAfterHeader(companyId);
    return NextResponse.json({
      ok: true,
      cleared,
      message: "Cleared Sheet1 (A1:Q).",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Clear failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
