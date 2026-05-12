import { NextRequest, NextResponse } from "next/server";
import { clearAllDataRowsAfterHeader } from "@/lib/googleSheets";
import { isCompanyId } from "@/lib/companies";

export const dynamic = "force-dynamic";

/**
 * DELETE — clear all Sheet1 values (A1:P) for the given company.
 */
export async function DELETE(request: NextRequest) {
  const companyId = request.nextUrl.searchParams.get("companyId");
  if (!companyId || !isCompanyId(companyId)) {
    return NextResponse.json(
      { success: false, error: "Missing or invalid companyId query parameter" },
      { status: 400 }
    );
  }
  try {
    const cleared = await clearAllDataRowsAfterHeader(companyId);
    return NextResponse.json({ success: true, cleared });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Reset failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
