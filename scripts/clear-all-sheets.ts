/**
 * Load `.env.local` into `process.env`, then clear Sheet1 for every company
 * (values + merged regions). Run from repo root:
 *   npx tsx scripts/clear-all-sheets.ts
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { COMPANIES } from "../lib/companies";
import { clearAllDataRowsAfterHeader } from "../lib/googleSheets";

function loadEnvLocal(): void {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("No .env.local found at", envPath);
    process.exit(1);
  }
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    val = val.replace(/\\n/g, "\n");
    process.env[key] = val;
  }
}

async function main() {
  loadEnvLocal();
  for (const c of COMPANIES) {
    console.log(`Clearing Sheet1 for ${c.id} (${c.name})…`);
    const n = await clearAllDataRowsAfterHeader(c.id);
    console.log(`  Done (had ${n} populated row(s) before clear).`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
