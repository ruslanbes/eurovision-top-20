import {
  ENTRY_CIRCLE,
  GROUP_SORT_LAST,
  MISSING_DIMENSION,
  UNKNOWN_COUNTRY_DIMENSION,
} from "../constants";
import {
  isFilledEntry,
  isMissingEntry,
  type BrowserEntry,
  type BrowserEpisode,
  type BrowserFilledEntry,
} from "../types";
import type { EpisodeScheme, EpisodeSchemeContext } from "./types";

export function isKnownCountryEntry(entry: BrowserFilledEntry): boolean {
  return entry.country.trim().length > 0 && entry.flag.trim().length > 0;
}

export function countryDimensionKey(entry: BrowserEntry): string {
  if (isMissingEntry(entry)) {
    return MISSING_DIMENSION;
  }
  if (isFilledEntry(entry) && isKnownCountryEntry(entry)) {
    return entry.country;
  }
  return UNKNOWN_COUNTRY_DIMENSION;
}

export function countryEntryColor(
  entry: BrowserEntry,
  ctx: EpisodeSchemeContext,
): string {
  const key = countryDimensionKey(entry);
  if (key === MISSING_DIMENSION) {
    return ctx.missingColor;
  }
  return ctx.colorMap[key] ?? ctx.missingColor;
}

export function countryEntryGlyph(entry: BrowserEntry): string {
  if (isFilledEntry(entry) && isKnownCountryEntry(entry)) {
    return entry.flag;
  }
  return ENTRY_CIRCLE;
}

export function countryGroupSortKey(entry: BrowserEntry): string {
  if (isMissingEntry(entry)) {
    return GROUP_SORT_LAST;
  }
  if (isFilledEntry(entry) && isKnownCountryEntry(entry)) {
    return entry.country;
  }
  return GROUP_SORT_LAST;
}

export function countryLegendItems(episodes: BrowserEpisode[]): string[] {
  const countries = new Set<string>();
  let hasUnknown = false;

  for (const episode of episodes) {
    for (const entry of episode.entries) {
      if (isMissingEntry(entry)) {
        continue;
      }
      if (isFilledEntry(entry) && isKnownCountryEntry(entry)) {
        countries.add(entry.country);
      } else {
        hasUnknown = true;
      }
    }
  }

  const items = [...countries].sort((a, b) => a.localeCompare(b));
  if (hasUnknown) {
    items.push(UNKNOWN_COUNTRY_DIMENSION);
  }
  return items;
}

export function countryLegendItemGlyph(
  item: string,
  ctx: EpisodeSchemeContext,
): string {
  if (item === UNKNOWN_COUNTRY_DIMENSION) {
    return ENTRY_CIRCLE;
  }
  return ctx.glyphMap?.[item] ?? ENTRY_CIRCLE;
}

export const countryScheme: EpisodeScheme = {
  id: "country",
  label: "Country",
  dimensionKey: countryDimensionKey,
  entryColor: countryEntryColor,
  entryGlyph: countryEntryGlyph,
  groupSortKey: countryGroupSortKey,
  legendItems: countryLegendItems,
  legendItemGlyph: countryLegendItemGlyph,
  legendItemAriaLabel: (item) =>
    item === UNKNOWN_COUNTRY_DIMENSION
      ? "Unknown country"
      : `Country: ${item}`,
};
