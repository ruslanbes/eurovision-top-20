import {
  isFilledEntry,
  type EpisodesBrowserPayload,
} from "./types";

export type EpisodesSeoEntry = {
  rank: number;
  title: string;
};

export type EpisodesSeoEpisode = {
  period: string;
  entries: EpisodesSeoEntry[];
};

/** Compact crawlable index: every month’s filled ranks + video titles. */
export function buildEpisodesSeoIndex(
  browser: EpisodesBrowserPayload,
): EpisodesSeoEpisode[] {
  return browser.episodes.map((episode) => ({
    period: episode.period,
    entries: episode.entries.filter(isFilledEntry).map((entry) => ({
      rank: entry.rank,
      title: entry.video_title,
    })),
  }));
}
