import type { SortingState } from "@tanstack/react-table";
import { escFinalPlaceSortKey } from "./escFinalPlace";
import type { SongStatsRow, StatsGrain, StatsRow, VideoStatsRow } from "./types";
import { statsRowKey } from "./types";

export const DEFAULT_SONG_SORT: SortingState = [
  { id: "chart_points", desc: true },
  { id: "top1", desc: true },
  { id: "top3", desc: true },
  { id: "top5", desc: true },
  { id: "top10", desc: true },
  { id: "top20", desc: true },
  { id: "song_label", desc: false },
];

export const DEFAULT_VIDEO_SORT: SortingState = [
  { id: "chart_points", desc: true },
  { id: "top1", desc: true },
  { id: "top3", desc: true },
  { id: "top5", desc: true },
  { id: "top10", desc: true },
  { id: "top20", desc: true },
  { id: "video_title", desc: false },
];

export function formatPeriodLabel(period: string): string {
  const [year, month] = period.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleString("en-US", { month: "short", year: "numeric" });
}

export function periodIndex(period: string, periods: string[]): number {
  const index = periods.indexOf(period);
  return index >= 0 ? index : 0;
}

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) {
    return 0;
  }
  if (a == null) {
    return 1;
  }
  if (b == null) {
    return -1;
  }
  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }
  return String(a).localeCompare(String(b));
}

function compareByColumn(
  rowA: StatsRow,
  rowB: StatsRow,
  columnId: string,
  grain: StatsGrain,
): number {
  if (columnId === "song_label") {
    const a = rowA as SongStatsRow;
    const b = rowB as SongStatsRow;
    const artistCmp = a.artist.localeCompare(b.artist);
    if (artistCmp !== 0) {
      return artistCmp;
    }
    return a.song.localeCompare(b.song);
  }
  if (columnId === "esc_final_place") {
    return (
      escFinalPlaceSortKey((rowA as StatsRow).esc_final_place) -
      escFinalPlaceSortKey((rowB as StatsRow).esc_final_place)
    );
  }
  const key = columnId as keyof StatsRow;
  return compareValues(
    (rowA as Record<string, unknown>)[key],
    (rowB as Record<string, unknown>)[key],
  );
}

export function sortStatsRows(
  rows: readonly StatsRow[],
  sorting: SortingState,
  grain: StatsGrain,
): StatsRow[] {
  const sorted = [...rows];
  sorted.sort((rowA, rowB) => {
    for (const { id, desc } of sorting) {
      const cmp = compareByColumn(rowA, rowB, id, grain);
      if (cmp !== 0) {
        return desc ? -cmp : cmp;
      }
    }
    return statsRowKey(rowA, grain).localeCompare(statsRowKey(rowB, grain));
  });
  return sorted;
}

export function buildOriginalRanks(
  rows: readonly StatsRow[],
  sorting: SortingState,
  grain: StatsGrain,
): Map<string, number> {
  const ranks = new Map<string, number>();
  for (const [index, row] of sortStatsRows(rows, sorting, grain).entries()) {
    ranks.set(statsRowKey(row, grain), index + 1);
  }
  return ranks;
}
