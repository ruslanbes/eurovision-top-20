import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  SongHitsPayload,
  SongMetaPayload,
  VideoHitsPayload,
  VideoMetaPayload,
} from "./queryWindow";
import type { QueryData } from "./data";
import type { StatsGrain } from "./types";

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

/** Prefer `public/data` after copy-packaged; fall back to repo `data/packaged`. */
export function resolveStatsQueryRoot(cwd = process.cwd()): string {
  const publicQuery = join(cwd, "public", "data", "packaged", "query");
  if (existsSync(join(publicQuery, "video-hits.json"))) {
    return publicQuery;
  }
  const repoQuery = join(cwd, "..", "data", "packaged", "query");
  if (existsSync(join(repoQuery, "video-hits.json"))) {
    return repoQuery;
  }
  throw new Error(
    "Stats query data not found — run site copy-packaged or pipeline package",
  );
}

/** Node loader mirroring `loadQueryData` (fs instead of fetch). */
export function loadQueryDataFromFs(
  grain: StatsGrain,
  queryRoot = resolveStatsQueryRoot(),
): QueryData {
  if (grain === "video") {
    return {
      hits: readJson<VideoHitsPayload>(join(queryRoot, "video-hits.json")),
      meta: readJson<VideoMetaPayload>(join(queryRoot, "video-meta.json")),
    };
  }
  return {
    hits: readJson<SongHitsPayload>(join(queryRoot, "song-hits.json")),
    meta: readJson<SongMetaPayload>(join(queryRoot, "song-meta.json")),
  };
}
