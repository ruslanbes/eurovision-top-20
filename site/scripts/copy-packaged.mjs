import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const siteRoot = join(__dirname, "..");
const repoRoot = join(siteRoot, "..");
const srcPackaged = join(repoRoot, "data", "packaged");
const destPublicData = join(siteRoot, "public", "data");
const destPackaged = join(destPublicData, "packaged");
const alltimeDir = join(destPackaged, "per-video", "alltime");
const recentDir = join(destPackaged, "per-video", "recent");
const alltimePattern = /^eurovision-top-20-alltime-(\d{4}-\d{2})\.json$/;
const recentPattern = /^eurovision-top-20-recent-(\d{4}-\d{2})\.json$/;

rmSync(destPackaged, { recursive: true, force: true });
mkdirSync(destPublicData, { recursive: true });
cpSync(srcPackaged, destPackaged, { recursive: true });

function listPeriods(dir, pattern) {
  return readdirSync(dir)
    .filter((name) => pattern.test(name))
    .map((name) => name.match(pattern)[1])
    .sort();
}

const alltimePeriods = listPeriods(alltimeDir, alltimePattern);
const recentPeriods = listPeriods(recentDir, recentPattern);

if (alltimePeriods.length === 0) {
  throw new Error(`No period snapshots found under ${alltimeDir}`);
}

if (recentPeriods.length === 0) {
  throw new Error(`No period snapshots found under ${recentDir}`);
}

const recentWindows = {};
for (const period of recentPeriods) {
  const path = join(recentDir, `eurovision-top-20-recent-${period}.json`);
  const payload = JSON.parse(readFileSync(path, "utf-8"));
  if (payload.window) {
    recentWindows[period] = payload.window;
  }
}

const alltimeManifest = {
  periods: alltimePeriods,
  latest: alltimePeriods[alltimePeriods.length - 1],
};

const recentManifest = {
  periods: recentPeriods,
  latest: recentPeriods[recentPeriods.length - 1],
  windows: recentWindows,
};

writeFileSync(
  join(destPublicData, "periods-alltime.json"),
  `${JSON.stringify(alltimeManifest, null, 2)}\n`,
  "utf-8",
);

writeFileSync(
  join(destPublicData, "periods-recent.json"),
  `${JSON.stringify(recentManifest, null, 2)}\n`,
  "utf-8",
);

console.log(
  `Copied packaged data; ${alltimePeriods.length} alltime periods (latest ${alltimeManifest.latest}), ${recentPeriods.length} recent periods (latest ${recentManifest.latest})`,
);
