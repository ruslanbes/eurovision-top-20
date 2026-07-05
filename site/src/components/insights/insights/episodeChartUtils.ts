import {
  episodeMonthYearLabel,
  youtubeWatchUrl,
} from "../../episodes/periodLabels";
import type { EpisodesBrowserPayload } from "../../episodes/types";
import type { InsightEpisodeLink } from "../types";

export function mayPeriod(contestYear: number): string {
  return `${contestYear}-05`;
}

export function corpusMayYears(periods: readonly string[]): number[] {
  const years = new Set<number>();
  for (const period of periods) {
    if (period.endsWith("-05")) {
      years.add(Number.parseInt(period.slice(0, 4), 10));
    }
  }
  return [...years].sort((left, right) => left - right);
}

export function isPreMayChartPeriod(period: string, contestYear: number): boolean {
  const [year, month] = period.split("-").map(Number);
  return year === contestYear && month < 5;
}

export function isMayChartPeriod(period: string, contestYear: number): boolean {
  return period === mayPeriod(contestYear);
}

export function isPostMayChartPeriod(period: string, contestYear: number): boolean {
  const [year, month] = period.split("-").map(Number);
  if (year === contestYear && month > 5) {
    return true;
  }
  return year === contestYear + 1 && month <= 4;
}

export function episodeWatchUrlsByPeriod(
  browser: EpisodesBrowserPayload,
): Map<string, string | null> {
  const urls = new Map<string, string | null>();
  for (const episode of browser.episodes) {
    urls.set(episode.period, youtubeWatchUrl(episode.youtube_video_id));
  }
  return urls;
}

export function episodeLinksForPeriods(
  periods: string[],
  episodeWatchUrls: Map<string, string | null>,
): InsightEpisodeLink[] {
  return periods.map((period) => ({
    label: episodeMonthYearLabel(period),
    href: episodeWatchUrls.get(period) ?? null,
  }));
}

export function qualifiesPostMayDebut(
  chartPeriods: Set<string>,
  contestYear: number,
  corpusPeriods: readonly string[],
): boolean {
  if (!corpusPeriods.includes(mayPeriod(contestYear))) {
    return false;
  }

  for (const period of chartPeriods) {
    if (isPreMayChartPeriod(period, contestYear) || isMayChartPeriod(period, contestYear)) {
      return false;
    }
  }

  return [...chartPeriods].some((period) => isPostMayChartPeriod(period, contestYear));
}

export function postMayChartPeriods(
  chartPeriods: Set<string>,
  contestYear: number,
): string[] {
  return [...chartPeriods]
    .filter((period) => isPostMayChartPeriod(period, contestYear))
    .sort();
}

export function firstPostMayChartPeriod(
  chartPeriods: Set<string>,
  contestYear: number,
): string | null {
  return postMayChartPeriods(chartPeriods, contestYear)[0] ?? null;
}
