import { uploadLinkFromSong, uploadLinkFromVideo, formatChartPoints } from "../formatters";
import type { InsightContext, InsightDefinition, InsightResult } from "../types";
import type { SongStatsRow, StatsGrain, VideoStatsRow } from "../../stats/types";

export type DominantLeadersParams = {
  absoluteGap: number;
  maxClusterSize: number;
  relativeGap: number;
};

export type ChartPointsRow = Pick<SongStatsRow, "chart_points" | "youtube_watch_url"> &
  (SongStatsRow | VideoStatsRow);

export type DominantLeadersMatch = {
  cluster: ChartPointsRow[];
  cutRank: number;
  gapToNext: number;
};

export function computeDominantLeaders(
  rows: ChartPointsRow[],
  params: DominantLeadersParams,
): DominantLeadersMatch | null {
  if (rows.length === 0) {
    return null;
  }

  const sorted = [...rows].sort((a, b) => b.chart_points - a.chart_points);
  const points = sorted.map((row) => row.chart_points);

  for (let cutRank = 1; cutRank <= points.length; cutRank += 1) {
    const top = points[cutRank - 1] ?? 0;
    const next = points[cutRank] ?? 0;
    if (top <= 0) {
      continue;
    }

    const gap = top - next;
    const relative = gap / top;
    if (relative < params.relativeGap) {
      continue;
    }

    if (cutRank > params.maxClusterSize || gap < params.absoluteGap) {
      return null;
    }

    return {
      cluster: sorted.slice(0, cutRank),
      cutRank,
      gapToNext: gap,
    };
  }

  return null;
}

function rowsForGrain(ctx: InsightContext, grain: StatsGrain): ChartPointsRow[] {
  return grain === "video" ? ctx.videoLatest : ctx.songLatest;
}

function uploadLinkForRow(
  row: ChartPointsRow,
  grain: StatsGrain,
  ctx: InsightContext,
): { href: string | null; label: string } {
  if (grain === "video") {
    return uploadLinkFromVideo(row as VideoStatsRow);
  }
  return uploadLinkFromSong(row as SongStatsRow, ctx.videoLatest);
}

function buildHighlightResult(
  match: DominantLeadersMatch,
  grain: StatsGrain,
  ctx: InsightContext,
  title: string,
): InsightResult {
  const noun = grain === "video" ? "uploads" : "songs";

  return {
    viewKind: "highlight",
    title,
    lead: `These ${noun} sit in a tight leader cluster with a large drop to the rest of the chart:`,
    items: match.cluster.map((row) => {
      const link = uploadLinkForRow(row, grain, ctx);
      return {
        label: link.label,
        href: link.href,
        meta: formatChartPoints(row.chart_points),
      };
    }),
    footnote: `Cut after rank ${match.cutRank}: ${formatChartPoints(match.gapToNext)} below the cluster (snapshot ${ctx.latestPeriod}).`,
  };
}

export function makeDominantLeadersInsight(
  grain: StatsGrain,
): InsightDefinition<DominantLeadersParams> {
  const id = grain === "video" ? "dominant-leaders-video" : "dominant-leaders-song";
  const title =
    grain === "video" ? "Dominant leaders (uploads)" : "Dominant leaders (songs)";

  return {
    id,
    section: "other",
    title,
    grain,
    defaultParams: {
      relativeGap: 0.25,
      absoluteGap: 50,
      maxClusterSize: 3,
    },
    needs: ["videoLatest", "songLatest", "periodsManifest"],
    compute(ctx, params) {
      const match = computeDominantLeaders(rowsForGrain(ctx, grain), params);
      if (!match) {
        return null;
      }
      return buildHighlightResult(match, grain, ctx, title);
    },
  };
}

export const dominantLeadersVideo = makeDominantLeadersInsight("video");
export const dominantLeadersSong = makeDominantLeadersInsight("song");
