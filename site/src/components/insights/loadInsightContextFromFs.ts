import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { EpisodesBrowserPayload } from "../episodes/types";
import type { SongHitsPayload, VideoHitsPayload } from "../stats/queryWindow";
import type { SongStatsSnapshot, VideoStatsSnapshot } from "../stats/types";
import type { DataNeed, InsightContext, PeriodsManifest } from "./types";

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

/** Prefer `public/data` after deliver-packaged; fall back to repo `data/packaged` for tests. */
export function resolveInsightDataRoot(cwd = process.cwd()): string {
  const publicData = join(cwd, "public", "data");
  if (existsSync(join(publicData, "packaged", "query", "video-hits.json"))) {
    return publicData;
  }
  const repoPackaged = join(cwd, "..", "data", "packaged");
  if (existsSync(join(repoPackaged, "query", "video-hits.json"))) {
    return join(cwd, "..", "data");
  }
  throw new Error(
    "Insight packaged data not found — run site deliver-packaged (public/data) or pipeline package",
  );
}

function packagedRoot(dataRoot: string): string {
  // public/data → …/packaged; repo data/ → …/packaged
  return join(dataRoot, "packaged");
}

function periodsManifestPath(dataRoot: string): string | null {
  const publicManifest = join(dataRoot, "periods-alltime.json");
  if (existsSync(publicManifest)) {
    return publicManifest;
  }
  return null;
}

/**
 * Build-time / Node loader mirroring `loadInsightContext` paths (fs instead of fetch).
 */
export function loadInsightContextFromFs(
  needs: Set<DataNeed>,
  dataRoot = resolveInsightDataRoot(),
): InsightContext {
  const packaged = packagedRoot(dataRoot);
  let latestPeriod = "";
  let periods: string[] = [];
  let videoLatest: InsightContext["videoLatest"] = [];
  let songHits: InsightContext["songHits"] = null;
  let songLatest: InsightContext["songLatest"] = [];
  let videoHits: InsightContext["videoHits"] = null;
  let episodesBrowser: InsightContext["episodesBrowser"] = null;

  if (needs.has("periodsManifest")) {
    const manifestFile = periodsManifestPath(dataRoot);
    if (manifestFile) {
      const manifest = readJson<PeriodsManifest>(manifestFile);
      latestPeriod = manifest.latest;
      periods = manifest.periods;
    }
  }

  if (needs.has("videoLatest")) {
    const snapshot = readJson<VideoStatsSnapshot>(
      join(packaged, "per-video/alltime/eurovision-top-20-alltime-latest.json"),
    );
    videoLatest = snapshot.rows;
  }

  if (needs.has("songHits")) {
    songHits = readJson<SongHitsPayload>(join(packaged, "query/song-hits.json"));
    if (periods.length === 0) {
      periods = songHits.periods;
    }
  }

  if (needs.has("songLatest")) {
    const snapshot = readJson<SongStatsSnapshot>(
      join(packaged, "per-song/alltime/eurovision-top-20-song-stats-latest.json"),
    );
    songLatest = snapshot.rows;
  }

  if (needs.has("videoHits")) {
    videoHits = readJson<VideoHitsPayload>(join(packaged, "query/video-hits.json"));
    periods = videoHits.periods;
    if (!latestPeriod) {
      latestPeriod = periods[periods.length - 1] ?? "";
    }
  }

  if (needs.has("episodesBrowser")) {
    episodesBrowser = readJson<EpisodesBrowserPayload>(
      join(packaged, "episodes/browser.json"),
    );
  }

  if (!latestPeriod && periods.length > 0) {
    latestPeriod = periods[periods.length - 1] ?? "";
  }

  return {
    episodesBrowser,
    latestPeriod,
    periods,
    songHits,
    songLatest,
    videoHits,
    videoLatest,
  };
}
