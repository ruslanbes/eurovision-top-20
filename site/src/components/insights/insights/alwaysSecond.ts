import { DEFAULT_VIDEO_SORT, sortStatsRows } from "../../stats/sort";
import type { VideoStatsRow } from "../../stats/types";
import { formatChartPoints, uploadLinkFromVideo } from "../formatters";
import type { HighlightItem, InsightContext, InsightDefinition, InsightResult } from "../types";

function bestTierLabel(row: VideoStatsRow): string {
  if (row.top3 > 0) {
    return "Top 3";
  }
  if (row.top5 > 0) {
    return "Top 5";
  }
  if (row.top10 > 0) {
    return "Top 10";
  }
  return "Top 20";
}

export function computeAlwaysSecond(rows: VideoStatsRow[]): VideoStatsRow[] {
  const eligible = rows.filter((row) => row.top1 === 0);
  if (eligible.length === 0) {
    return [];
  }

  const sorted = sortStatsRows(eligible, DEFAULT_VIDEO_SORT, "video") as VideoStatsRow[];
  const topPoints = sorted[0]?.chart_points;
  if (topPoints == null || topPoints <= 0) {
    return [];
  }

  return sorted.filter((row) => row.chart_points === topPoints);
}

function buildHighlightResult(
  leaders: VideoStatsRow[],
  latestPeriod: string,
  title: string,
): InsightResult {
  const items: HighlightItem[] = leaders.map((row) => {
    const link = uploadLinkFromVideo(row);
    return {
      label: link.label,
      href: link.href,
      meta: `${formatChartPoints(row.chart_points)} · best ${bestTierLabel(row)} · ${row.top20} Top 20`,
    };
  });

  return {
    viewKind: "highlight",
    title,
    lead: "Strongest uploads that never reached rank 1 in any episode:",
    items,
    footnote: `Eligible rows: top1 = 0. Sort matches the video stats table default (snapshot ${latestPeriod}).`,
  };
}

export const alwaysSecondVideo: InsightDefinition<Record<string, never>> = {
  id: "always-second-video",
  section: "other",
  title: "Always second",
  grain: "video",
  defaultParams: {},
  needs: ["videoLatest", "periodsManifest"],
  compute(ctx) {
    const leaders = computeAlwaysSecond(ctx.videoLatest);
    if (leaders.length === 0) {
      return null;
    }
    return buildHighlightResult(leaders, ctx.latestPeriod, "Always second");
  },
};
