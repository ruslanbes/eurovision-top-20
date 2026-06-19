export type PeriodManifest = {
  periods: string[];
  latest: string;
};

export type SongStatsRow = {
  artist: string;
  song: string;
  flag: string;
  country: string;
  year: number;
  esc_final_place: number | string | null;
  top1: number;
  top3: number;
  top5: number;
  top10: number;
  top20: number;
  chart_points: number;
};

export type SongStatsSnapshot = {
  source: string;
  rows: SongStatsRow[];
};

export type VideoStatsRow = {
  video_title: string;
  top1: number;
  top3: number;
  top5: number;
  top10: number;
  top20: number;
  chart_points: number;
  esc_final_place: number | string | null;
  youtube_video_id: string;
  youtube_watch_url: string | null;
  artist: string | null;
  song: string | null;
  flag: string | null;
  country: string | null;
  performance_type: string | null;
  year: number | null;
  metadata_extractor: string | null;
};

export type VideoStatsSnapshot = {
  source: string;
  rows: VideoStatsRow[];
};

export type StatsGrain = "video" | "song";

export type StatsRow = VideoStatsRow | SongStatsRow;

export function statsRowKey(row: StatsRow, grain: StatsGrain): string {
  if (grain === "video") {
    return (row as VideoStatsRow).youtube_video_id || (row as VideoStatsRow).video_title;
  }
  const songRow = row as SongStatsRow;
  return `${songRow.artist}\0${songRow.song}`;
}
