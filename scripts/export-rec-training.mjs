/**
 * Export RecImpression rows with labels from RecEvent (7-day window).
 * Usage: node scripts/export-rec-training.mjs > training.csv
 * Or: node scripts/export-rec-training.mjs --out training.csv
 */
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REC_FEATURE_DIM = 9;

const prisma = new PrismaClient();

function parseArgs() {
  const a = process.argv.slice(2);
  const outIdx = a.indexOf("--out");
  const out = outIdx >= 0 ? a[outIdx + 1] : null;
  return { out };
}

async function main() {
  const { out } = parseArgs();

  const rows = await prisma.$queryRaw`
    SELECT
      i.features AS features,
      CASE
        WHEN EXISTS (
          SELECT 1 FROM "RecEvent" e
          WHERE e."userId" = i."userId"
            AND e."tmdbId" = i."tmdbId"
            AND e."mediaType" = i."mediaType"
            AND e.kind IN ('click', 'watchlist_add', 'rate_pos')
            AND e."createdAt" > i."shownAt"
            AND e."createdAt" < i."shownAt" + INTERVAL '7 days'
        )
        THEN 1
        ELSE 0
      END AS label
    FROM "RecImpression" i
  `;

  const lines = ["label," + Array.from({ length: REC_FEATURE_DIM }, (_, i) => `f${i}`).join(",")];
  for (const r of rows) {
    const f = r.features;
    if (!Array.isArray(f) || f.length !== REC_FEATURE_DIM) continue;
    const label = Number(r.label);
    if (label !== 0 && label !== 1) continue;
    lines.push([label, ...f.map((x) => Number(x))].join(","));
  }

  const csv = lines.join("\n") + "\n";
  if (out) {
    const dir = path.dirname(path.resolve(out));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(out, csv, "utf8");
    console.error(`Wrote ${lines.length - 1} rows to ${path.resolve(out)}`);
  } else {
    process.stdout.write(csv);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
