import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { REPO_URL, parseLatestRelease } from "./parse-changelog-release.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const siteRoot = join(__dirname, "..");
const repoRoot = join(siteRoot, "..");
const changelogPath = join(repoRoot, "CHANGELOG.md");
const outDir = join(siteRoot, "src", "generated");
const outPath = join(outDir, "releaseMeta.json");

const content = readFileSync(changelogPath, "utf-8");
const { version, releaseDate } = parseLatestRelease(content);

const meta = {
  name: "Eurovision Top 20",
  version,
  releaseDate,
  repoUrl: REPO_URL,
};

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, `${JSON.stringify(meta, null, 2)}\n`, "utf-8");

console.log(`Release meta: v${version} (${releaseDate}) → src/generated/releaseMeta.json`);
