import type { EpisodesBrowserPayload } from "../episodes/types";
import type { VideoHitsPayload } from "../stats/queryWindow";
import type { SongStatsSnapshot, VideoStatsSnapshot } from "../stats/types";
import type { DataNeed, InsightContext, PeriodsManifest } from "./types";

const dataBase = `${import.meta.env.BASE_URL}data`;

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url} (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export async function loadInsightContext(needs: Set<DataNeed>): Promise<InsightContext> {
  let latestPeriod = "";
  let periods: string[] = [];
  let videoLatest: InsightContext["videoLatest"] = [];
  let songLatest: InsightContext["songLatest"] = [];
  let videoHits: InsightContext["videoHits"] = null;
  let episodesBrowser: InsightContext["episodesBrowser"] = null;

  const tasks: Promise<void>[] = [];

  if (needs.has("periodsManifest")) {
    tasks.push(
      fetchJson<PeriodsManifest>(`${dataBase}/periods-alltime.json`).then((manifest) => {
        latestPeriod = manifest.latest;
        if (periods.length === 0) {
          periods = manifest.periods;
        }
      }),
    );
  }

  if (needs.has("videoLatest")) {
    tasks.push(
      fetchJson<VideoStatsSnapshot>(
        `${dataBase}/packaged/per-video/alltime/eurovision-top-20-alltime-latest.json`,
      ).then((snapshot) => {
        videoLatest = snapshot.rows;
      }),
    );
  }

  if (needs.has("songLatest")) {
    tasks.push(
      fetchJson<SongStatsSnapshot>(
        `${dataBase}/packaged/per-song/alltime/eurovision-top-20-song-stats-latest.json`,
      ).then((snapshot) => {
        songLatest = snapshot.rows;
      }),
    );
  }

  if (needs.has("videoHits")) {
    tasks.push(
      fetchJson<VideoHitsPayload>(`${dataBase}/packaged/query/video-hits.json`).then((payload) => {
        videoHits = payload;
        periods = payload.periods;
      }),
    );
  }

  if (needs.has("episodesBrowser")) {
    tasks.push(
      fetchJson<EpisodesBrowserPayload>(
        `${dataBase}/packaged/episodes/browser.json`,
      ).then((payload) => {
        episodesBrowser = payload;
      }),
    );
  }

  await Promise.all(tasks);

  return { episodesBrowser, latestPeriod, periods, songLatest, videoHits, videoLatest };
}

export function collectDataNeeds(
  definitions: { needs: DataNeed[] }[],
): Set<DataNeed> {
  const needs = new Set<DataNeed>();
  for (const definition of definitions) {
    for (const need of definition.needs) {
      needs.add(need);
    }
  }
  return needs;
}
