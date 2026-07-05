import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { hashStringToColor } from "./hash-color.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const siteRoot = join(__dirname, "..");
const repoRoot = join(siteRoot, "..");
const packaged = join(repoRoot, "data", "packaged");
const browserPath = join(packaged, "episodes", "browser.json");
const videoLatestPath = join(
  packaged,
  "per-video",
  "alltime",
  "eurovision-top-20-alltime-latest.json",
);
const outDir = join(siteRoot, "src", "generated");
const outPath = join(outDir, "episodeSchemeColors.json");

const ARTIST_SEPARATOR =
  /\s+(?:&|and|og|y|x|feat\.?|ft\.?|featuring)\s+/i;

function normalizedSongKeyPart(value) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[\u2018\u2019`\u00B4]/g, "'")
    .toLocaleLowerCase("en")
    .replace(/\s*&\s*/g, " and ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\band\b/g, " and ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedSongKeyArtist(value) {
  const base = normalizedSongKeyPart(value);
  const parts = base.split(ARTIST_SEPARATOR).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) {
    return base;
  }
  parts.sort();
  return parts.join(" & ");
}

function songMetaLookupKey(artist, song) {
  return `${normalizedSongKeyArtist(artist)}\0${normalizedSongKeyPart(song)}`;
}

function memberPrecedenceKey(row) {
  return [
    row.chart_points,
    row.top1,
    row.top3,
    row.top5,
    row.top10,
    row.top20,
    row.video_title.toLocaleLowerCase("en"),
  ];
}

function compareMemberPrecedence(left, right) {
  const leftKey = memberPrecedenceKey(left);
  const rightKey = memberPrecedenceKey(right);
  for (let index = 0; index < leftKey.length; index += 1) {
    const leftPart = leftKey[index];
    const rightPart = rightKey[index];
    if (leftPart === rightPart) {
      continue;
    }
    if (typeof leftPart === "number" && typeof rightPart === "number") {
      return leftPart < rightPart ? -1 : 1;
    }
    return String(leftPart).localeCompare(String(rightPart));
  }
  return 0;
}

function isEligibleSongRollupRow(row) {
  return (
    row.artist?.trim() &&
    row.song?.trim() &&
    row.flag?.trim() &&
    row.country?.trim() &&
    row.year != null
  );
}

function pickCanonicalSongMember(members) {
  return members.reduce((best, row) =>
    compareMemberPrecedence(row, best) > 0 ? row : best,
  );
}

const browser = JSON.parse(readFileSync(browserPath, "utf-8"));
const videoLatest = JSON.parse(readFileSync(videoLatestPath, "utf-8")).rows;

const videoTitles = new Set();
const songKeysInBrowser = new Set();

for (const episode of browser.episodes) {
  for (const entry of episode.entries) {
    if (entry.missing) {
      continue;
    }
    videoTitles.add(entry.video_title);
    if (entry.artist?.trim() && entry.song?.trim()) {
      songKeysInBrowser.add(songMetaLookupKey(entry.artist, entry.song));
    }
  }
}

const membersBySongKey = new Map();
for (const row of videoLatest) {
  if (!isEligibleSongRollupRow(row)) {
    continue;
  }
  const key = songMetaLookupKey(row.artist, row.song);
  const members = membersBySongKey.get(key) ?? [];
  members.push(row);
  membersBySongKey.set(key, members);
}

const videos = {};
for (const title of [...videoTitles].sort()) {
  videos[title] = hashStringToColor(title);
}

const songs = {};
for (const songKey of [...songKeysInBrowser].sort()) {
  const members = membersBySongKey.get(songKey) ?? [];
  if (members.length === 0) {
    continue;
  }
  const canonical = pickCanonicalSongMember(members);
  songs[songKey] = hashStringToColor(canonical.video_title);
}

const payload = { songs, videos };

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");

console.log(
  `Episode scheme colors: ${Object.keys(videos).length} videos, ${Object.keys(songs).length} songs → src/generated/episodeSchemeColors.json`,
);
