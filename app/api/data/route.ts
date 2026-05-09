import { NextRequest, NextResponse } from "next/server";
import { buildDashboardData } from "@/lib/dashboardAggregates";
import { readAllRecords } from "@/lib/googleSheets";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const records = await readAllRecords();
    const data = buildDashboardData(records);
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
