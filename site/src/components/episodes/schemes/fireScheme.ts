import {
  ENTRY_CIRCLE,
  FIRE_GLYPH,
  MISSING_DIMENSION,
} from "../constants";
import {
  isFilledEntry,
  isMissingEntry,
  type BrowserEntry,
  type BrowserEpisode,
  type BrowserFilledEntry,
} from "../types";
import type { EpisodeScheme, EpisodeSchemeContext } from "./types";

export const FIRE_DIMENSION = "Fire";
export const FIRE_OTHER_DIMENSION = "Other";

export function isFireEntry(entry: BrowserFilledEntry): boolean {
  return entry.fire === true;
}

export function fireDimensionKey(entry: BrowserEntry): string {
  if (isMissingEntry(entry)) {
    return MISSING_DIMENSION;
  }
  if (isFilledEntry(entry) && isFireEntry(entry)) {
    return FIRE_DIMENSION;
  }
  return FIRE_OTHER_DIMENSION;
}

export function fireEntryColor(
  entry: BrowserEntry,
  ctx: EpisodeSchemeContext,
): string {
  const key = fireDimensionKey(entry);
  if (key === MISSING_DIMENSION) {
    return ctx.missingColor;
  }
  return ctx.colorMap[key] ?? ctx.missingColor;
}

export function fireEntryGlyph(entry: BrowserEntry): string {
  if (isFilledEntry(entry) && isFireEntry(entry)) {
    return FIRE_GLYPH;
  }
  return ENTRY_CIRCLE;
}

export function fireGroupSortKey(entry: BrowserEntry): number {
  if (isMissingEntry(entry)) {
    return -1;
  }
  if (isFilledEntry(entry) && isFireEntry(entry)) {
    return 1;
  }
  return 0;
}

export function fireLegendItems(_episodes: BrowserEpisode[]): string[] {
  return [FIRE_DIMENSION, FIRE_OTHER_DIMENSION];
}

export function fireLegendItemGlyph(
  item: string,
  _ctx: EpisodeSchemeContext,
): string {
  return item === FIRE_DIMENSION ? FIRE_GLYPH : ENTRY_CIRCLE;
}

export const fireScheme: EpisodeScheme = {
  id: "fire",
  label: "Fire",
  dimensionKey: fireDimensionKey,
  entryColor: fireEntryColor,
  entryGlyph: fireEntryGlyph,
  groupSortKey: fireGroupSortKey,
  legendItems: fireLegendItems,
  legendItemGlyph: fireLegendItemGlyph,
  legendItemAriaLabel: (item) =>
    item === FIRE_DIMENSION ? "Fire-themed video" : "Not fire-themed",
};
