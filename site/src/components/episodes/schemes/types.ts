import type { BrowserEntry, BrowserEpisode } from "../types";

export type EpisodeSchemeContext = {
  colorMap: Record<string, string>;
  missingColor: string;
  glyphMap?: Record<string, string>;
};

export type EpisodeScheme = {
  dimensionKey: (entry: BrowserEntry) => string;
  entryColor: (entry: BrowserEntry, ctx: EpisodeSchemeContext) => string;
  entryGlyph: (entry: BrowserEntry) => string;
  entrySearchHaystack?: (entry: BrowserEntry) => string;
  groupSortKey: (entry: BrowserEntry) => string | number;
  highlightMode?: "legend" | "search";
  id: string;
  label: string;
  legendItemAriaLabel: (item: string) => string;
  legendItemGlyph: (item: string, ctx: EpisodeSchemeContext) => string;
  legendItems: (episodes: BrowserEpisode[]) => string[];
};
