import {
  uploadLinkFromVideo,
  formatChartPoints,
  songLinkFromSong,
} from "../formatters";
import type { HighlightItem, InsightContext, InsightDefinition, InsightResult } from "../types";
import type { SongStatsRow, StatsGrain, VideoStatsRow } from "../../stats/types";

export type YearClassicsParams = {
  /** Max contest edition year = snapshot calendar year − this value. */
  minAgeYears: number;
  /** Minimum cumulative Top 20 episode appearances. */
  minTop20: number;
  maxItems: number;
};

export type ClassicCandidate = {
  chart_points: number;
  contest_year: number;
  label: string;
  top20: number;
  watchUrl: string | null;
};

type TierRow = {
  chart_points: number;
  top20: number;
  year: number | null;
};

function snapshotCalendarYear(latestPeriod: string): number {
  const year = Number.parseInt(latestPeriod.slice(0, 4), 10);
  return Number.isFinite(year) ? year : new Date().getFullYear();
}

export function computeYearClassics(
  rows: TierRow[],
  latestPeriod: string,
  params: YearClassicsParams,
  linkForRow: (row: TierRow) => { href: string | null; label: string },
): ClassicCandidate[] {
  const maxContestYear = snapshotCalendarYear(latestPeriod) - params.minAgeYears;

  return rows
    .filter(
      (row) =>
        row.year != null &&
        row.year <= maxContestYear &&
        row.top20 >= params.minTop20,
    )
    .sort((left, right) => {
      if (right.top20 !== left.top20) {
        return right.top20 - left.top20;
      }
      return right.chart_points - left.chart_points;
    })
    .slice(0, params.maxItems)
    .map((row) => {
      const link = linkForRow(row);
      return {
        label: link.label,
        contest_year: row.year!,
        top20: row.top20,
        chart_points: row.chart_points,
        watchUrl: link.href,
      };
    });
}

function buildHighlightResult(
  classics: ClassicCandidate[],
  grain: StatsGrain,
  latestPeriod: string,
  params: YearClassicsParams,
  title: string,
): InsightResult | null {
  if (classics.length === 0) {
    return null;
  }

  const maxContestYear = snapshotCalendarYear(latestPeriod) - params.minAgeYears;
  const noun = grain === "video" ? "uploads" : "songs";

  const items: HighlightItem[] = classics.map((classic) => ({
    label: classic.label,
    href: classic.watchUrl,
    meta: `${classic.top20} Top 20 episodes · ${formatChartPoints(classic.chart_points)} · ESC ${classic.contest_year}`,
  }));

  return {
    viewKind: "highlight",
    title,
    lead: `Undying Eurovision classics — ${noun} from contest year ${maxContestYear} and earlier with at least ${params.minTop20} Top 20 appearances:`,
    items,
    footnote: `Contest year cutoff: calendar ${snapshotCalendarYear(latestPeriod)} − ${params.minAgeYears} years (snapshot ${latestPeriod}).`,
  };
}

export function makeYearClassicsInsight(
  grain: StatsGrain,
): InsightDefinition<YearClassicsParams> {
  const id = grain === "video" ? "year-classics-video" : "year-classics-song";
  const title =
    grain === "video"
      ? "Undying Eurovision classics (uploads)"
      : "Undying Eurovision classics (songs)";

  return {
    id,
    section: "year",
    title,
    grain,
    defaultParams: {
      minAgeYears: 10,
      minTop20: 40,
      maxItems: 10,
    },
    needs: ["videoLatest", "songLatest", "periodsManifest"],
    compute(ctx, params) {
      if (grain === "video") {
        const classics = computeYearClassics(
          ctx.videoLatest,
          ctx.latestPeriod,
          params,
          (row) => uploadLinkFromVideo(row as VideoStatsRow),
        );
        return buildHighlightResult(classics, grain, ctx.latestPeriod, params, title);
      }

      const classics = computeYearClassics(
        ctx.songLatest,
        ctx.latestPeriod,
        params,
        (row) => songLinkFromSong(row as SongStatsRow, ctx.videoLatest),
      );
      return buildHighlightResult(classics, grain, ctx.latestPeriod, params, title);
    },
  };
}

export const yearClassicsVideo = makeYearClassicsInsight("video");
export const yearClassicsSong = makeYearClassicsInsight("song");
