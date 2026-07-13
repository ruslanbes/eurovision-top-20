import type { ReactNode } from "react";
import { videoLinkLabel } from "../formatters";
import {
  bestRankForWinnerVideos,
  buildEpisodeRankIndex,
  primaryWinnerVideo,
  winnerVideosForYear,
} from "../escWinnerData";
import {
  buildUpRankLinkTitle,
  buildUpSongsPageHref,
  songMetaFromSongLatest,
  winnerRankInBuildUpPool,
} from "../buildUpRankUtils";
import type { VideoStatsRow } from "../../stats/types";
import type {
  InsightContext,
  InsightDefinition,
  InsightResult,
  InsightTableRow,
} from "../types";

export const UNCROWNED_MIN_CONTEST_YEAR = 2017;
export const BUILD_UP_RANK_MIN_CONTEST_YEAR = 2022;

function contestYearsWithWinners(
  videoLatest: VideoStatsRow[],
  minYear: number,
): number[] {
  const years = new Set<number>();
  for (const row of videoLatest) {
    if (row.year != null && row.year >= minYear && row.esc_final_place === 1) {
      years.add(row.year);
    }
  }
  return [...years].sort((left, right) => left - right);
}

export function computeUncrownedRows(ctx: InsightContext): InsightTableRow[] {
  if (!ctx.videoHits) {
    return [];
  }

  const rankIndex = buildEpisodeRankIndex(ctx.videoHits);
  const rows: InsightTableRow[] = [];

  for (const year of contestYearsWithWinners(
    ctx.videoLatest,
    UNCROWNED_MIN_CONTEST_YEAR,
  )) {
    const winners = winnerVideosForYear(ctx.videoLatest, year);
    if (winners.length === 0) {
      continue;
    }

    const { bestRank, everTop1 } = bestRankForWinnerVideos(rankIndex, winners);
    if (everTop1) {
      continue;
    }

    const video = primaryWinnerVideo(winners);
    rows.push({
      year: String(year),
      status: bestRank === null ? "unknown" : "no",
      statusTitle: bestRank === null ? "Not in Top 20" : undefined,
      rank: bestRank,
      linkLabel: video ? videoLinkLabel(video) : null,
      linkHref: video?.youtube_watch_url ?? null,
    });
  }

  return rows;
}

export function computeBuildUpRankRows(ctx: InsightContext): InsightTableRow[] {
  if (!ctx.songHits || ctx.songLatest.length === 0) {
    return [];
  }

  const songMeta = songMetaFromSongLatest(ctx.songLatest);
  const rows: InsightTableRow[] = [];

  for (const year of contestYearsWithWinners(
    ctx.videoLatest,
    BUILD_UP_RANK_MIN_CONTEST_YEAR,
  )) {
    const winners = winnerVideosForYear(ctx.videoLatest, year);
    const video = primaryWinnerVideo(winners);
    if (!video?.artist?.trim() || !video.song?.trim()) {
      continue;
    }

    const { poolSize, rank } = winnerRankInBuildUpPool(
      ctx.songHits,
      songMeta,
      ctx.periods,
      year,
      video.artist,
      video.song,
    );

    const rankLabel =
      rank !== null && poolSize > 0 ? `${rank} of ${poolSize}` : undefined;

    rows.push({
      year: String(year),
      status: "unknown",
      rank: null,
      rankLabel,
      rankHref: rankLabel ? buildUpSongsPageHref(year, ctx.periods) : null,
      rankLinkTitle: rankLabel ? buildUpRankLinkTitle(year) : undefined,
      linkLabel: videoLinkLabel(video),
      linkHref: video.youtube_watch_url ?? null,
    });
  }

  return rows;
}

function buildTableResult(
  rows: InsightTableRow[],
  title: string,
  lead: ReactNode,
  footnote: string,
  options: {
    showHitColumn?: boolean;
    showRankColumn?: boolean;
    linkColumnLabel?: string;
    rankColumnLabel?: string;
  } = {},
): InsightResult | null {
  if (rows.length === 0) {
    return null;
  }

  return {
    viewKind: "table",
    title,
    lead,
    rows,
    footnote,
    showHitColumn: options.showHitColumn,
    showRankColumn: options.showRankColumn,
    linkColumnLabel: options.linkColumnLabel,
    rankColumnLabel: options.rankColumnLabel,
    tableKind: "esc_winner",
  };
}

export const escBuildUpRank: InsightDefinition<Record<string, never>> = {
  id: "esc-build-up-rank",
  section: "esc_winner",
  title: "Build-up rank",
  grain: "song",
  defaultParams: {},
  needs: ["videoLatest", "songLatest", "songHits", "periodsManifest"],
  compute(ctx) {
    const rows = computeBuildUpRankRows(ctx);
    return buildTableResult(
      rows,
      "Build-up rank",
      "Where each winner stood before the contest compared to other contestants.",
      "Rank = position among that year’s entries that charted at least once in the pre-contest window (May prior year through April). Years 2022 onward.",
      {
        showHitColumn: false,
        showRankColumn: true,
        rankColumnLabel: "Build-up rank",
        linkColumnLabel: "ESC winner",
      },
    );
  },
};

export const escUncrowned: InsightDefinition<Record<string, never>> = {
  id: "esc-uncrowned",
  section: "esc_winner",
  title: "Uncrowned",
  grain: "video",
  defaultParams: {},
  needs: ["videoLatest", "videoHits", "periodsManifest"],
  compute(ctx) {
    const rows = computeUncrownedRows(ctx);
    return buildTableResult(
      rows,
      "Uncrowned",
      "ESC winners who never reached #1 on the Top 20",
      "Year 2017 onward",
      {
        showHitColumn: false,
        showRankColumn: true,
        rankColumnLabel: "Best rank",
        linkColumnLabel: "ESC winner",
      },
    );
  },
};
