import type { ReactNode } from "react";
import { videoLinkLabel } from "../formatters";
import {
  bestRankForWinnerVideos,
  buildEpisodeRankIndex,
  contestYearsForEpisodeMonth,
  primaryWinnerVideo,
  winnerVideosForYear,
} from "../escWinnerData";
import type { VideoStatsRow } from "../../stats/types";
import type {
  InsightContext,
  InsightDefinition,
  InsightResult,
  InsightTableRow,
  InsightTableStatus,
} from "../types";

export const UNCROWNED_MIN_CONTEST_YEAR = 2017;

export type EscWinnerInsightParams = {
  episodeMonth: 4;
  /** Contest years to include even when that month’s episode is missing from the corpus. */
  extraContestYears?: number[];
};

type EvaluatedRow = {
  rank: number | null;
  status?: InsightTableStatus;
  statusTitle?: string;
  video: VideoStatsRow | null;
  year: number;
};

function evaluateContestYear(
  ctx: InsightContext,
  contestYear: number,
  period: string,
  rankIndex: ReturnType<typeof buildEpisodeRankIndex>,
): EvaluatedRow {
  const winners = winnerVideosForYear(ctx.videoLatest, contestYear);

  if (!ctx.periods.includes(period)) {
    return {
      year: contestYear,
      status: "unknown",
      statusTitle: "No episode",
      rank: null,
      video: primaryWinnerVideo(winners),
    };
  }

  if (winners.length === 0) {
    return {
      year: contestYear,
      status: "unknown",
      statusTitle: "No winner video on channel",
      rank: null,
      video: null,
    };
  }

  const ranksForPeriod = rankIndex.get(period);
  let bestRank: number | null = null;
  let bestVideo: VideoStatsRow | null = null;

  for (const video of winners) {
    const rank = ranksForPeriod?.get(video.video_title);
    if (rank === undefined) {
      continue;
    }
    if (bestRank === null || rank < bestRank) {
      bestRank = rank;
      bestVideo = video;
    }
  }

  if (bestRank === null || bestVideo === null) {
    return {
      year: contestYear,
      status: "no",
      statusTitle: "Not in Top 20",
      rank: null,
      video: primaryWinnerVideo(winners),
    };
  }

  return {
    year: contestYear,
    rank: bestRank,
    video: bestVideo,
  };
}

export function computeEscWinnerTableRows(
  ctx: InsightContext,
  params: EscWinnerInsightParams,
): InsightTableRow[] {
  if (!ctx.videoHits) {
    return [];
  }

  const rankIndex = buildEpisodeRankIndex(ctx.videoHits);
  const periodSuffix = `-${String(params.episodeMonth).padStart(2, "0")}`;
  const years = [
    ...new Set([
      ...contestYearsForEpisodeMonth(ctx.periods, params.episodeMonth),
      ...(params.extraContestYears ?? []),
    ]),
  ].sort((left, right) => left - right);

  return years.map((year) => {
    const evaluated = evaluateContestYear(
      ctx,
      year,
      `${year}${periodSuffix}`,
      rankIndex,
    );

    return {
      year: String(evaluated.year),
      status: evaluated.status ?? "unknown",
      statusTitle: evaluated.statusTitle,
      rank: evaluated.rank,
      linkLabel: evaluated.video ? videoLinkLabel(evaluated.video) : null,
      linkHref: evaluated.video?.youtube_watch_url ?? null,
    };
  });
}

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

type EscWinnerInsightOptions = {
  footnote: string;
  lead: ReactNode;
  showHitColumn?: boolean;
  showRankColumn?: boolean;
  rankColumnLabel?: string;
};

export function makeEscWinnerInsight(
  id: string,
  title: string,
  params: EscWinnerInsightParams,
  options: EscWinnerInsightOptions,
): InsightDefinition<EscWinnerInsightParams> {
  return {
    id,
    section: "esc_winner",
    title,
    grain: "video",
    defaultParams: params,
    needs: ["videoLatest", "videoHits", "periodsManifest"],
    compute(ctx, insightParams) {
      const rows = computeEscWinnerTableRows(ctx, insightParams);
      return buildTableResult(rows, title, options.lead, options.footnote, {
        showHitColumn: options.showHitColumn,
        showRankColumn: options.showRankColumn,
        rankColumnLabel: options.rankColumnLabel,
        linkColumnLabel: "ESC winner",
      });
    },
  };
}

export const escAprilPulse = makeEscWinnerInsight(
  "esc-april-pulse",
  "April pulse",
  { episodeMonth: 4, extraContestYears: [2019] },
  {
    lead: "April chart rank of the ESC winner’s video.",
    footnote:
      "Rank = position in the April Most Watched episode. — = video not in that month’s Top 20, or no April episode.",
    showHitColumn: false,
    showRankColumn: true,
  },
);

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
