import { songMetaLookupKey } from "../../stats/songMetaLookupKey";
import type { SongStatsRow, VideoStatsRow } from "../../stats/types";
import type { VideoHitsPayload } from "../../stats/queryWindow";
import { songLinkFromSong } from "../formatters";
import type { InsightContext, InsightDefinition, InsightResult } from "../types";

export type YearClassicsParams = {
  /** Minimum distinct calendar years with at least one Top 20 hit (any video). */
  minDistinctYears: number;
  maxItems: number;
};

export type ClassicCandidate = {
  chart_points: number;
  contest_year: number;
  distinct_years: number;
  label: string;
  top20: number;
  watchUrl: string | null;
};

function videoRowByTitle(videoLatest: VideoStatsRow[]): Map<string, VideoStatsRow> {
  return new Map(videoLatest.map((row) => [row.video_title, row]));
}

export function chartYearsBySongKey(
  hits: VideoHitsPayload,
  videoLatest: VideoStatsRow[],
): Map<string, Set<string>> {
  const byTitle = videoRowByTitle(videoLatest);
  const bySong = new Map<string, Set<string>>();

  for (const hit of hits.hits) {
    const row = byTitle.get(hit.video_title);
    if (!row?.artist?.trim() || !row.song?.trim()) {
      continue;
    }

    const key = songMetaLookupKey(row.artist, row.song);
    let years = bySong.get(key);
    if (!years) {
      years = new Set();
      bySong.set(key, years);
    }

    for (const entry of hit.entries) {
      years.add(entry.period.slice(0, 4));
    }
  }

  return bySong;
}

export function computeYearClassics(
  hits: VideoHitsPayload,
  videoLatest: VideoStatsRow[],
  songLatest: SongStatsRow[],
  params: YearClassicsParams,
): ClassicCandidate[] {
  const yearsByKey = chartYearsBySongKey(hits, videoLatest);
  const candidates: ClassicCandidate[] = [];

  for (const songRow of songLatest) {
    const key = songMetaLookupKey(songRow.artist, songRow.song);
    const years = yearsByKey.get(key);
    if (!years || years.size < params.minDistinctYears) {
      continue;
    }

    const link = songLinkFromSong(songRow, videoLatest);
    candidates.push({
      label: link.label,
      contest_year: songRow.year,
      distinct_years: years.size,
      top20: songRow.top20,
      chart_points: songRow.chart_points,
      watchUrl: link.href,
    });
  }

  return candidates
    .sort((left, right) => {
      if (right.distinct_years !== left.distinct_years) {
        return right.distinct_years - left.distinct_years;
      }
      if (right.chart_points !== left.chart_points) {
        return right.chart_points - left.chart_points;
      }
      return left.label.localeCompare(right.label);
    })
    .slice(0, params.maxItems);
}

export const yearClassics: InsightDefinition<YearClassicsParams> = {
  id: "year-classics",
  section: "year",
  title: "Undying Eurovision classics",
  grain: "song",
  defaultParams: {
    minDistinctYears: 8,
    maxItems: 10,
  },
  needs: ["videoLatest", "songLatest", "videoHits", "periodsManifest"],
  compute(ctx, params) {
    if (!ctx.videoHits) {
      return null;
    }

    const classics = computeYearClassics(
      ctx.videoHits,
      ctx.videoLatest,
      ctx.songLatest,
      params,
    );

    if (classics.length === 0) {
      return null;
    }

    const rows = classics.map((classic) => ({
      id: `${classic.distinct_years}\0${classic.label}`,
      count: classic.distinct_years,
      label: classic.label,
      labelHref: classic.watchUrl,
    }));

    return {
      viewKind: "table",
      tableKind: "count_label",
      countColumnLabel: "Chart years",
      labelColumn: "Song",
      title: "Undying Eurovision classics",
      lead: `Songs with Top 20 appearances in at least ${params.minDistinctYears} distinct calendar years (any video counts):`,
      rows,
    };
  },
};
