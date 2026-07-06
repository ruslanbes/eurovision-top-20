import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const siteRoot = join(__dirname, "..");
const repoRoot = join(siteRoot, "..");
const sourcePath = join(repoRoot, "data", "metadata", "insight-row-footnotes.json");
const outDir = join(siteRoot, "src", "generated");
const outPath = join(outDir, "insightRowFootnotes.json");

const payload = JSON.parse(readFileSync(sourcePath, "utf-8"));
if (payload.schema_version !== 1) {
  throw new Error(`unsupported insight-row-footnotes schema_version: ${payload.schema_version}`);
}
if (!Array.isArray(payload.rules)) {
  throw new Error("insight-row-footnotes.json rules must be an array");
}

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");

console.log(
  `Insight row footnotes: ${payload.rules.length} rule(s) → src/generated/insightRowFootnotes.json`,
);
