import type { ReactNode } from "react";
import { uploadLinkLabel } from "../formatters";
import {
  buildEpisodeRankIndex,
  contestYearsForEpisodeMonth,
  primaryWinnerUpload,
  winnerUploadsForYear,
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
};

type EvaluatedRow = {
  rank: number | null;
  status?: InsightTableStatus;
  statusTitle?: string;
  upload: VideoStatsRow | null;
  year: number;
};

function evaluateContestYear(
  ctx: InsightContext,
  contestYear: number,
  period: string,
  episodeMonth: 4 | 5,
  rankIndex: ReturnType<typeof buildEpisodeRankIndex>,
): EvaluatedRow {
  const winners = winnerUploadsForYear(ctx.videoLatest, contestYear);

  if (!ctx.periods.includes(period)) {
    return {
      year: contestYear,
      status: "unknown",
      statusTitle: "No episode",
      rank: null,
      upload: primaryWinnerUpload(winners),
    };
  }

  if (winners.length === 0) {
    return {
      year: contestYear,
      status: "unknown",
      statusTitle: "No winner upload on channel",
      rank: null,
      upload: null,
    };
  }

  let bestRank: number | null = null;
  let bestUpload: VideoStatsRow | null = null;
  const ranksForPeriod = rankIndex.get(period);

  for (const upload of winners) {
    const rank = ranksForPeriod?.get(upload.video_title);
    if (rank === undefined) {
      continue;
    }
    if (bestRank === null || rank < bestRank) {
      bestRank = rank;
      bestUpload = upload;
    }
  }

  if (bestRank === null || bestUpload === null) {
    return {
      year: contestYear,
      status: "no",
      statusTitle: "Not in Top 20",
      rank: null,
      upload: primaryWinnerUpload(winners),
    };
  }

  if (episodeMonth === 4) {
    return {
      year: contestYear,
      rank: bestRank,
      upload: bestUpload,
    };
  }

  if (bestRank === 1) {
    return {
      year: contestYear,
      status: "yes",
      rank: bestRank,
      upload: bestUpload,
    };
  }

  return {
    year: contestYear,
    status: "no",
    statusTitle: `Rank ${bestRank}`,
    rank: bestRank,
    upload: bestUpload,
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
  const years = contestYearsForEpisodeMonth(ctx.periods, params.episodeMonth);

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
      linkLabel: evaluated.upload ? uploadLinkLabel(evaluated.upload) : null,
      linkHref: evaluated.upload?.youtube_watch_url ?? null,
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
  { episodeMonth: 4 },
  {
    lead: "April chart rank of the ESC winner’s upload.",
    footnote:
      "Rank = position in the April Most Watched episode. — = upload not in that month’s Top 20, or no April episode.",
    showHitColumn: false,
    showRankColumn: true,
  },
);

export const escMayCrown = makeEscWinnerInsight(
  "esc-may-crown",
  "May crown",
  { episodeMonth: 5 },
  {
    lead: "Was the ESC winner’s upload at rank 1 in the May episode for that contest year?",
    footnote: "✓ = winner upload at #1 in May; ✗ = miss; — = no episode or no winner upload.",
  },
);
