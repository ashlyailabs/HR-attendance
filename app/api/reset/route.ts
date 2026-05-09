import { NextResponse } from "next/server";
import { clearAllDataRowsAfterHeader } from "@/lib/googleSheets";

export const dynamic = "force-dynamic";

/**
 * DELETE — remove all Sheet1 data rows (row 2+). Row 1 headers are kept.
 */
export async function DELETE() {
  try {
    const cleared = await clearAllDataRowsAfterHeader();
    return NextResponse.json({ success: true, cleared });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Reset failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
