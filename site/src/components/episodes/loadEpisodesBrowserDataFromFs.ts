import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { EpisodesBrowserPayload, YearColors } from "./types";

export type EpisodesBrowserData = {
  browser: EpisodesBrowserPayload;
  yearColors: YearColors;
};

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

/** Prefer `public/data` after deliver-packaged; fall back to repo `data/packaged`. */
export function resolveEpisodesDataRoot(cwd = process.cwd()): string {
  const publicEpisodes = join(cwd, "public", "data", "packaged", "episodes");
  if (existsSync(join(publicEpisodes, "browser.json"))) {
    return publicEpisodes;
  }
  const repoEpisodes = join(cwd, "..", "data", "packaged", "episodes");
  if (existsSync(join(repoEpisodes, "browser.json"))) {
    return repoEpisodes;
  }
  throw new Error(
    "Episodes packaged data not found — run site deliver-packaged or pipeline package",
  );
}

/** Node loader mirroring `loadEpisodesBrowserData` (fs instead of fetch). */
export function loadEpisodesBrowserDataFromFs(
  episodesRoot = resolveEpisodesDataRoot(),
): EpisodesBrowserData {
  return {
    browser: readJson<EpisodesBrowserPayload>(join(episodesRoot, "browser.json")),
    yearColors: readJson<YearColors>(join(episodesRoot, "year-colors.json")),
  };
}
