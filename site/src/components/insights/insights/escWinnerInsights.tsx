import type { ReactNode } from "react";
import { videoLinkLabel } from "../formatters";
import {
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

export type EscWinnerInsightParams = {
  episodeMonth: 4 | 5;
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
  episodeMonth: 4 | 5,
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

  let bestRank: number | null = null;
  let bestVideo: VideoStatsRow | null = null;
  const ranksForPeriod = rankIndex.get(period);

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

  if (episodeMonth === 4) {
    return {
      year: contestYear,
      rank: bestRank,
      video: bestVideo,
    };
  }

  if (bestRank === 1) {
    return {
      year: contestYear,
      status: "yes",
      rank: bestRank,
      video: bestVideo,
    };
  }

  return {
    year: contestYear,
    status: "no",
    statusTitle: `Rank ${bestRank}`,
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
      params.episodeMonth,
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

function buildTableResult(
  rows: InsightTableRow[],
  title: string,
  lead: ReactNode,
  footnote: string,
  options: { showHitColumn?: boolean; showRankColumn?: boolean; linkColumnLabel?: string } = {},
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
    tableKind: "esc_winner",
  };
}

type EscWinnerInsightOptions = {
  footnote: string;
  lead: ReactNode;
  showHitColumn?: boolean;
  showRankColumn?: boolean;
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

export const escMayCrown = makeEscWinnerInsight(
  "esc-may-crown",
  "May crown",
  { episodeMonth: 5 },
  {
    lead: "Was the ESC winner’s video at rank 1 in the May episode for that contest year?",
    footnote: "✓ = winner video at #1 in May; ✗ = miss; — = no episode or no winner video.",
  },
);
