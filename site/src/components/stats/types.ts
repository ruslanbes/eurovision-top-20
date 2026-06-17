export type PeriodManifest = {
  periods: string[];
  latest: string;
};

export type VideoStatsRow = {
  video_title: string;
  top1: number;
  top3: number;
  top5: number;
  top10: number;
  top20: number;
  chart_points: number;
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
