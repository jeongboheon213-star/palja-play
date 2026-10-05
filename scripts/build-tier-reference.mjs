import { readFileSync, writeFileSync } from "node:fs";
const report = JSON.parse(readFileSync("docs/tier-distribution.json", "utf8").replace(/^\uFEFF/, ""));
if (report.accepted !== 569776 || report.rejected !== 8 || report.methodology.stepDays !== 1 || report.methodology.times.length !== 12 || report.scoreVersion !== "score-0.1.0") throw new Error("Reference sample changed: review before versioning");
const histograms = Object.fromEntries(Object.entries(report.report).map(([key, row]) => {
  if (row.histogram.length !== 101 || row.histogram.reduce((a, b) => a + b, 0) !== report.accepted) throw new Error(key);
  return [key, row.histogram];
}));
const source = '// Generated from docs/tier-distribution.json; run scripts/build-tier-reference.mjs.\n' +
  'export const TIER_REFERENCE_VERSION = "tier-reference-0.1.0";\n' +
  `export const REFERENCE_SAMPLE_SIZE = ${report.accepted};\n` +
  `export const REFERENCE_HISTOGRAMS = ${JSON.stringify(histograms)} as const;\n`;
if (process.argv.includes("--check")) {
  if (readFileSync("src/lib/tier/reference.ts", "utf8") !== source) throw new Error("Tier reference is stale");
} else writeFileSync("src/lib/tier/reference.ts", source);
