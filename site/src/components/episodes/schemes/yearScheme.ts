import { ENTRY_CIRCLE, MISSING_DIMENSION } from "../constants";
import { isFilledEntry, isMissingEntry, type BrowserEntry, type BrowserEpisode } from "../types";
import type { EpisodeScheme, EpisodeSchemeContext } from "./types";

export function yearDimensionKey(entry: BrowserEntry): string {
  if (isMissingEntry(entry)) {
    return MISSING_DIMENSION;
  }
  if (entry.year == null) {
    return MISSING_DIMENSION;
  }
  return String(entry.year);
}

export function yearEntryColor(
  entry: BrowserEntry,
  ctx: EpisodeSchemeContext,
): string {
  const key = yearDimensionKey(entry);
  if (key === MISSING_DIMENSION) {
    return ctx.missingColor;
  }
  return ctx.colorMap[key] ?? ctx.missingColor;
}

export function yearGroupSortKey(entry: BrowserEntry): number {
  if (isMissingEntry(entry) || (isFilledEntry(entry) && entry.year == null)) {
    return -1;
  }
  return entry.year ?? -1;
}

export function yearLegendItems(episodes: BrowserEpisode[]): string[] {
  const years = new Set<string>();
  for (const episode of episodes) {
    for (const entry of episode.entries) {
      if (isMissingEntry(entry) || entry.year == null) {
        continue;
      }
      years.add(String(entry.year));
    }
  }
  return [...years].sort((a, b) => Number(b) - Number(a));
}

export const yearScheme: EpisodeScheme = {
  id: "year",
  label: "Contest year",
  dimensionKey: yearDimensionKey,
  entryColor: yearEntryColor,
  entryGlyph: () => ENTRY_CIRCLE,
  groupSortKey: yearGroupSortKey,
  legendItems: yearLegendItems,
  legendItemGlyph: (_item, _ctx) => ENTRY_CIRCLE,
  legendItemAriaLabel: (item) => `Contest year ${item}`,
};
