import { ENTRY_CIRCLE, GROUP_SORT_LAST, MISSING_DIMENSION } from "../constants";
import { isFilledEntry, isMissingEntry, type BrowserEntry, type BrowserEpisode } from "../types";
import type { EpisodeScheme, EpisodeSchemeContext } from "./types";

export function videosDimensionKey(entry: BrowserEntry): string {
  if (isMissingEntry(entry)) {
    return MISSING_DIMENSION;
  }
  return entry.video_title;
}

export function videosEntryColor(
  entry: BrowserEntry,
  ctx: EpisodeSchemeContext,
): string {
  const key = videosDimensionKey(entry);
  if (key === MISSING_DIMENSION) {
    return ctx.missingColor;
  }
  return ctx.colorMap[key] ?? ctx.missingColor;
}

export function videosGroupSortKey(entry: BrowserEntry): string {
  if (isMissingEntry(entry)) {
    return GROUP_SORT_LAST;
  }
  return entry.video_title;
}

export function videosSearchHaystack(entry: BrowserEntry): string {
  if (isMissingEntry(entry)) {
    return "";
  }
  return entry.video_title;
}

export const videosScheme: EpisodeScheme = {
  id: "videos",
  label: "Videos",
  highlightMode: "search",
  dimensionKey: videosDimensionKey,
  entryColor: videosEntryColor,
  entryGlyph: () => ENTRY_CIRCLE,
  entrySearchHaystack: videosSearchHaystack,
  groupSortKey: videosGroupSortKey,
  legendItems: (_episodes: BrowserEpisode[]) => [],
  legendItemGlyph: (_item, _ctx) => ENTRY_CIRCLE,
  legendItemAriaLabel: (item) => item,
};
