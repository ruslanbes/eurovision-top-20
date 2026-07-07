import type { VideoHitsPayload } from "../../stats/queryWindow";
import type { VideoStatsRow } from "../../stats/types";

export type EpisodeRankIndex = Map<string, Map<string, number>>;

export function buildEpisodeRankIndex(hits: VideoHitsPayload): EpisodeRankIndex {
  const index: EpisodeRankIndex = new Map();

  for (const hit of hits.hits) {
    for (const entry of hit.entries) {
      let byTitle = index.get(entry.period);
      if (!byTitle) {
        byTitle = new Map();
        index.set(entry.period, byTitle);
      }
      byTitle.set(hit.video_title, entry.rank);
    }
  }

  return index;
}

export function winnerVideosForYear(
  videoLatest: VideoStatsRow[],
  contestYear: number,
): VideoStatsRow[] {
  return videoLatest.filter(
    (row) => row.year === contestYear && row.esc_final_place === 1,
  );
}

export function primaryWinnerVideo(
  videos: VideoStatsRow[],
): VideoStatsRow | null {
  if (videos.length === 0) {
    return null;
  }

  return [...videos].sort((left, right) => {
    if (right.chart_points !== left.chart_points) {
      return right.chart_points - left.chart_points;
    }
    return left.video_title.localeCompare(right.video_title);
  })[0] ?? null;
}

export type BestRankForWinners = {
  bestRank: number | null;
  bestVideo: VideoStatsRow | null;
  everTop1: boolean;
};

export function bestRankForWinnerVideos(
  rankIndex: EpisodeRankIndex,
  winners: VideoStatsRow[],
): BestRankForWinners {
  let bestRank: number | null = null;
  let bestVideo: VideoStatsRow | null = null;
  let everTop1 = false;

  for (const video of winners) {
    for (const byTitle of rankIndex.values()) {
      const rank = byTitle.get(video.video_title);
      if (rank === undefined) {
        continue;
      }
      if (rank === 1) {
        everTop1 = true;
      }
      if (bestRank === null || rank < bestRank) {
        bestRank = rank;
        bestVideo = video;
      }
    }
  }

  return { bestRank, bestVideo, everTop1 };
}

export function contestYearsForEpisodeMonth(
  periods: string[],
  month: number,
): number[] {
  const suffix = `-${String(month).padStart(2, "0")}`;
  const years = new Set<number>();

  for (const period of periods) {
    if (period.endsWith(suffix)) {
      years.add(Number.parseInt(period.slice(0, 4), 10));
    }
  }

  return [...years].sort((left, right) => left - right);
}
