import type { SongStatsRow, StatsGrain, StatsRow, VideoStatsRow } from "../types";
import { searchFilterActive, textMatchesQuery } from "./normalizeSearchText";

export const SEARCH_FILTER_ID = "search";

export function rowSearchHaystack(row: StatsRow, grain: StatsGrain): string {
  if (grain === "video") {
    return (row as VideoStatsRow).video_title ?? "";
  }
  const songRow = row as SongStatsRow;
  return `${songRow.artist} — ${songRow.song}`;
}

export function searchFilterMatch(
  row: StatsRow,
  grain: StatsGrain,
  selected: readonly (string | number)[],
): boolean {
  if (!searchFilterActive(selected)) {
    return true;
  }
  const query = selected[0];
  if (typeof query !== "string") {
    return true;
  }
  return textMatchesQuery(rowSearchHaystack(row, grain), query);
}
