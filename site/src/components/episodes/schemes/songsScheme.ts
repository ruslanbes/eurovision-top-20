import { songMetaLookupKey } from "../../stats/songMetaLookupKey";
import { ENTRY_CIRCLE, GROUP_SORT_LAST, MISSING_DIMENSION } from "../constants";
import { isFilledEntry, isMissingEntry, type BrowserEntry, type BrowserEpisode } from "../types";
import type { EpisodeScheme, EpisodeSchemeContext } from "./types";

export function songsDimensionKey(entry: BrowserEntry): string {
  if (isMissingEntry(entry)) {
    return MISSING_DIMENSION;
  }
  if (!entry.artist?.trim() || !entry.song?.trim()) {
    return MISSING_DIMENSION;
  }
  return songMetaLookupKey(entry.artist, entry.song);
}

export function songsEntryColor(
  entry: BrowserEntry,
  ctx: EpisodeSchemeContext,
): string {
  const key = songsDimensionKey(entry);
  if (key === MISSING_DIMENSION) {
    return ctx.missingColor;
  }
  return ctx.colorMap[key] ?? ctx.missingColor;
}

export function songsGroupSortKey(entry: BrowserEntry): string {
  if (isMissingEntry(entry)) {
    return GROUP_SORT_LAST;
  }
  if (!isFilledEntry(entry) || !entry.artist?.trim() || !entry.song?.trim()) {
    return GROUP_SORT_LAST;
  }
  return songMetaLookupKey(entry.artist, entry.song);
}

export function songsSearchHaystack(entry: BrowserEntry): string {
  if (isMissingEntry(entry) || !entry.artist?.trim() || !entry.song?.trim()) {
    return "";
  }
  return `${entry.artist} — ${entry.song}`;
}

export const songsScheme: EpisodeScheme = {
  id: "songs",
  label: "Songs",
  highlightMode: "search",
  dimensionKey: songsDimensionKey,
  entryColor: songsEntryColor,
  entryGlyph: () => ENTRY_CIRCLE,
  entrySearchHaystack: songsSearchHaystack,
  groupSortKey: songsGroupSortKey,
  legendItems: (_episodes: BrowserEpisode[]) => [],
  legendItemGlyph: (_item, _ctx) => ENTRY_CIRCLE,
  legendItemAriaLabel: (item) => item,
};
