import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const siteRoot = join(__dirname, "..");
const repoRoot = join(siteRoot, "..");
const srcPackaged = join(repoRoot, "data", "packaged");
const destPublicData = join(siteRoot, "public", "data");
const destPackaged = join(destPublicData, "packaged");
const queryHitsPath = join(destPackaged, "query", "video-hits.json");

rmSync(destPackaged, { recursive: true, force: true });
mkdirSync(destPublicData, { recursive: true });
cpSync(srcPackaged, destPackaged, { recursive: true });

if (!existsSync(queryHitsPath)) {
  throw new Error("Missing query/video-hits.json after copy — run package first");
}

const queryHits = JSON.parse(readFileSync(queryHitsPath, "utf-8"));
const periods = queryHits.periods;

if (!Array.isArray(periods) || periods.length === 0) {
  throw new Error("query/video-hits.json has no periods");
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
  `Copied packaged data; ${periods.length} episode periods (latest ${manifest.latest})`,
);
