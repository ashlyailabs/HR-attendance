import { NextRequest, NextResponse } from "next/server";
import { appendRecords, fetchExistingKeysAndDates } from "@/lib/googleSheets";
import { processAttendanceFromBuffer } from "@/lib/processAttendance";
import { isCompanyId } from "@/lib/companies";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const companyId = request.nextUrl.searchParams.get("companyId");
  if (!companyId || !isCompanyId(companyId)) {
    return NextResponse.json(
      { error: "Missing or invalid companyId query parameter" },
      { status: 400 }
    );
  }
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "Missing file field (multipart form key: file)" },
        { status: 400 }
      );
    }
    const name = "name" in file ? String(file.name) : "";
    if (!name.toLowerCase().endsWith(".xlsx")) {
      return NextResponse.json(
        { error: "Only .xlsx files are supported" },
        { status: 400 }
      );
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const records = processAttendanceFromBuffer(buffer);
    const { keys, dates } = await fetchExistingKeysAndDates(companyId);
    const result = await appendRecords(companyId, records, keys, dates);
    return NextResponse.json({
      inserted: result.inserted,
      skipped: result.skipped,
      records: result.records,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
