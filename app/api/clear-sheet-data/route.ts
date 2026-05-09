import { NextRequest, NextResponse } from "next/server";
import { clearAllDataRowsAfterHeader } from "@/lib/googleSheets";

export const dynamic = "force-dynamic";

/**
 * One-time: wipe Sheet1 data (keeps row 1). Requires `CLEAR_SHEET_TOKEN` in `.env.local`
 * matching the JSON body `{ "token": "..." }`.
 */
export async function POST(request: NextRequest) {
  const expected = process.env.CLEAR_SHEET_TOKEN?.trim();
  if (!expected) {
    return NextResponse.json(
      { error: "Set CLEAR_SHEET_TOKEN in .env.local to use this endpoint." },
      { status: 503 }
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
    const cleared = await clearAllDataRowsAfterHeader();
    return NextResponse.json({
      ok: true,
      cleared,
      message: "Cleared data rows (row 1 preserved).",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Clear failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
