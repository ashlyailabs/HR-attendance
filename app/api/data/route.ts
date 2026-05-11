import { NextRequest, NextResponse } from "next/server";
import { buildDashboardData } from "@/lib/dashboardAggregates";
import { readAllRecords } from "@/lib/googleSheets";
import { isCompanyId } from "@/lib/companies";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const companyId = request.nextUrl.searchParams.get("companyId");
  if (!companyId || !isCompanyId(companyId)) {
    return NextResponse.json(
      { error: "Missing or invalid companyId query parameter" },
      { status: 400 }
    );
  }
  try {
    const records = await readAllRecords(companyId);
    const data = buildDashboardData(records);
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
