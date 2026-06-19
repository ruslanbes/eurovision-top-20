import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const siteRoot = join(__dirname, "..");
const repoRoot = join(siteRoot, "..");
const srcPackaged = join(repoRoot, "data", "packaged");
const destPublicData = join(siteRoot, "public", "data");
const destPackaged = join(destPublicData, "packaged");
const alltimeDir = join(destPackaged, "per-video", "alltime");
const periodPattern = /^eurovision-top-20-alltime-(\d{4}-\d{2})\.json$/;

rmSync(destPackaged, { recursive: true, force: true });
mkdirSync(destPublicData, { recursive: true });
cpSync(srcPackaged, destPackaged, { recursive: true });

const periods = readdirSync(alltimeDir)
  .filter((name) => periodPattern.test(name))
  .map((name) => name.match(periodPattern)[1])
  .sort();

if (periods.length === 0) {
  throw new Error(`No period snapshots found under ${alltimeDir}`);
}

const manifest = {
  periods,
  latest: periods[periods.length - 1],
};

writeFileSync(
  join(destPublicData, "periods-alltime.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf-8",
);

console.log(
  `Copied packaged data; ${periods.length} alltime periods (latest ${manifest.latest})`,
);
