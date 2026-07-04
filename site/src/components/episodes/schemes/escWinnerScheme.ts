import { ENTRY_CIRCLE, MISSING_DIMENSION } from "../constants";
import { isEscWinner } from "../../stats/filters/esc";
import { isMissingEntry, type BrowserEntry, type BrowserEpisode } from "../types";
import type { EpisodeScheme, EpisodeSchemeContext } from "./types";

export const ESC_WINNER_DIMENSION = "Winner";
export const ESC_OTHER_DIMENSION = "Other";

export function escWinnerDimensionKey(entry: BrowserEntry): string {
  if (isMissingEntry(entry)) {
    return MISSING_DIMENSION;
  }
  if (isEscWinner(entry.esc_final_place)) {
    return ESC_WINNER_DIMENSION;
  }
  return ESC_OTHER_DIMENSION;
}

export function escWinnerEntryColor(
  entry: BrowserEntry,
  ctx: EpisodeSchemeContext,
): string {
  const key = escWinnerDimensionKey(entry);
  if (key === MISSING_DIMENSION) {
    return ctx.missingColor;
  }
  return ctx.colorMap[key] ?? ctx.missingColor;
}

export function escWinnerGroupSortKey(entry: BrowserEntry): number {
  if (isMissingEntry(entry)) {
    return -1;
  }
  if (isEscWinner(entry.esc_final_place)) {
    return 1;
  }
  return 0;
}

export function escWinnerLegendItems(_episodes: BrowserEpisode[]): string[] {
  return [ESC_WINNER_DIMENSION, ESC_OTHER_DIMENSION];
}

export const escWinnerScheme: EpisodeScheme = {
  id: "esc-winner",
  label: "ESC winners",
  dimensionKey: escWinnerDimensionKey,
  entryColor: escWinnerEntryColor,
  entryGlyph: () => ENTRY_CIRCLE,
  groupSortKey: escWinnerGroupSortKey,
  legendItems: escWinnerLegendItems,
  legendItemGlyph: (_item, _ctx) => ENTRY_CIRCLE,
  legendItemAriaLabel: (item) =>
    item === ESC_WINNER_DIMENSION ? "ESC winner" : "Not an ESC winner",
};
