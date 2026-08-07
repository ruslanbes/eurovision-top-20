import type { QueryData, SongQueryData, VideoQueryData } from "./data";
import {
  loadQueryDataFromFs,
  resolveStatsQueryRoot,
} from "./loadQueryDataFromFs";
import { querySongWindow, queryVideoWindow } from "./queryWindow";
import { defaultStatsUiState } from "./statsUiState";
import type { SongStatsRow, StatsGrain, VideoStatsRow } from "./types";

export type DefaultStatsSnapshot = {
  periods: string[];
  rows: VideoStatsRow[] | SongStatsRow[];
};

/**
 * Full-corpus, no-filter rows (default sort from query*Window).
 * Shared by Astro SSG and tests.
 */
export function buildDefaultStatsRows(
  grain: StatsGrain,
  queryRoot = resolveStatsQueryRoot(),
): DefaultStatsSnapshot {
  return buildDefaultStatsRowsFromQueryData(grain, loadQueryDataFromFs(grain, queryRoot));
}

export function buildDefaultStatsRowsFromQueryData(
  grain: StatsGrain,
  data: QueryData,
): DefaultStatsSnapshot {
  const periods = data.hits.periods;
  if (periods.length === 0) {
    throw new Error("Query index has no episode periods");
  }
  const { begin, end } = defaultStatsUiState(periods).window;
  if (grain === "video") {
    const { hits, meta } = data as VideoQueryData;
    return {
      periods,
      rows: queryVideoWindow(hits, meta, begin, end) as VideoStatsRow[],
    };
  }
  const { hits, meta } = data as SongQueryData;
  return {
    periods,
    rows: querySongWindow(hits, meta, begin, end) as SongStatsRow[],
  };
}
