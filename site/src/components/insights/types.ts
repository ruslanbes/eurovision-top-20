import type { ReactNode } from "react";
import type { EpisodesBrowserPayload } from "../episodes/types";
import type { VideoHitsPayload } from "../stats/queryWindow";
import type {
  SongStatsRow,
  StatsGrain,
  VideoStatsRow,
} from "../stats/types";

export type InsightSection = "year" | "esc_winner" | "other";

export type InsightGrain = StatsGrain;

export type DataNeed =
  | "episodesBrowser"
  | "periodsManifest"
  | "songLatest"
  | "videoHits"
  | "videoLatest";

export type PeriodsManifest = {
  latest: string;
  periods: string[];
};

export type InsightContext = {
  episodesBrowser: EpisodesBrowserPayload | null;
  latestPeriod: string;
  periods: string[];
  songLatest: SongStatsRow[];
  videoHits: VideoHitsPayload | null;
  videoLatest: VideoStatsRow[];
};

export type InsightEpisodeLink = {
  href: string | null;
  label: string;
  period: string;
};

export type InsightLabelEpisodesRow = {
  contestYear?: number;
  episodes: InsightEpisodeLink[];
  id: string;
  label: string;
  labelHref: string | null;
  rowNote?: string;
};

export type InsightCountLabelRow = {
  count: number;
  id: string;
  label: string;
  labelHref: string | null;
};

export type HighlightItem = {
  href?: string | null;
  label: string;
  meta?: string;
};

export type InsightTableStatus = "no" | "unknown" | "yes";

export type InsightTableRow = {
  linkHref: string | null;
  linkLabel: string | null;
  rank: number | null;
  rowNote?: string;
  status: InsightTableStatus;
  statusTitle?: string;
  year: string;
};

export type InsightResult =
  | {
      footnote?: string;
      items: HighlightItem[];
      lead: string;
      title: string;
      viewKind: "highlight";
    }
  | {
      cells: (number | null)[][];
      colLabel: string;
      colorScale: "binary" | "sequential";
      cols: { id: string; label: string }[];
      rowLabel: string;
      rows: { id: string; label: string }[];
      title: string;
      valueFormat?: (value: number) => string;
      viewKind: "matrix";
    }
  | {
      footnote?: string;
      lead?: ReactNode;
      linkColumnLabel?: string;
      rankColumnLabel?: string;
      rows: InsightTableRow[];
      showHitColumn?: boolean;
      showRankColumn?: boolean;
      tableKind?: "esc_winner";
      title: string;
      viewKind: "table";
    }
  | {
      countColumnLabel: string;
      footnote?: string;
      labelColumn: string;
      lead?: ReactNode;
      rows: InsightCountLabelRow[];
      tableKind: "count_label";
      title: string;
      viewKind: "table";
    }
  | {
      episodeColumnLabel?: string;
      footnote?: string;
      labelColumn: string;
      lead?: ReactNode;
      rows: InsightLabelEpisodesRow[];
      showYearColumn?: boolean;
      tableKind: "label_episodes";
      title: string;
      viewKind: "table";
    };

export type InsightDefinition<P extends Record<string, unknown> = Record<string, unknown>> = {
  compute: (ctx: InsightContext, params: P) => InsightResult | null;
  defaultParams: P;
  grain: InsightGrain;
  id: string;
  needs: DataNeed[];
  section: InsightSection;
  title: string;
};

export const INSIGHT_SECTION_LABEL: Record<InsightSection, string> = {
  esc_winner: "ESC winner insights",
  other: "Other",
  year: "Year insights",
};
