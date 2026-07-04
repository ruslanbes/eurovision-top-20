export type ColorMapEntry = {
  hex: string;
  source: string;
};

export type YearColors = {
  colors: Record<string, ColorMapEntry>;
  version: number;
};

export type BrowserMissingEntry = {
  missing: true;
  rank: number;
};

export type BrowserFilledEntry = {
  artist: string;
  country: string;
  esc_final_place: number | string;
  fire: boolean;
  flag: string;
  performance_category: string;
  rank: number;
  song: string;
  video_title: string;
  year: number | null;
  youtube_video_id: string;
};

export type BrowserEntry = BrowserMissingEntry | BrowserFilledEntry;

export type BrowserEpisode = {
  entries: BrowserEntry[];
  missing: number;
  period: string;
};

export type EpisodesBrowserPayload = {
  entry_capacity: number;
  episodes: BrowserEpisode[];
  periods: string[];
  version: number;
};

export function isMissingEntry(entry: BrowserEntry): entry is BrowserMissingEntry {
  return "missing" in entry && entry.missing === true;
}

export function isFilledEntry(entry: BrowserEntry): entry is BrowserFilledEntry {
  return !isMissingEntry(entry);
}
