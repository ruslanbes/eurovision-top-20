import type { BrowserEntry, BrowserEpisode } from "../types";

export type EpisodeSchemeContext = {
  colorMap: Record<string, string>;
  missingColor: string;
  glyphMap?: Record<string, string>;
};

export type EpisodeScheme = {
  id: string;
  label: string;
  dimensionKey: (entry: BrowserEntry) => string;
  entryColor: (entry: BrowserEntry, ctx: EpisodeSchemeContext) => string;
  entryGlyph: (entry: BrowserEntry) => string;
  groupSortKey: (entry: BrowserEntry) => string | number;
  legendItems: (episodes: BrowserEpisode[]) => string[];
  legendItemGlyph: (item: string, ctx: EpisodeSchemeContext) => string;
  legendItemAriaLabel: (item: string) => string;
};
