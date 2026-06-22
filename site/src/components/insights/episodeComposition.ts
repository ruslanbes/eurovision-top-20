import { formatPeriodLabel } from "../stats/sort";

export type CompositionSegment = {
  country: string;
  count: number;
  titles?: string[];
};

export type CompositionEpisode = {
  filled: number;
  missing: number;
  period: string;
  segments: CompositionSegment[];
};

export type InsightColorEntry = {
  hex: string;
  source: string;
};

export type YearColors = {
  colors: Record<string, InsightColorEntry>;
  version: number;
};

export type YearCompositionSegment = {
  count: number;
  titles: string[];
  year: string;
};

export type YearCompositionEpisode = {
  filled: number;
  missing: number;
  period: string;
  segments: YearCompositionSegment[];
};

export type EpisodeYearComposition = {
  episodes: YearCompositionEpisode[];
  periods: string[];
  slot_capacity: number;
  version: number;
};

export type CompositionBarSegment = {
  country: string;
  count: number;
  widthPercent: number;
  color: string;
  isMissing: boolean;
  titles?: string[];
};

export const MISSING_COUNTRY = "__missing__";
export const UNKNOWN_COUNTRY = "Unknown";
export const MISSING_SLOT_LABEL = "Missing";

export function calendarYearFromPeriod(period: string): string {
  const [year] = period.split("-");
  return year ?? period;
}

export function yearLabelBeforeEpisode(
  index: number,
  periods: string[],
): string | null {
  const current = periods[index];
  if (!current) {
    return null;
  }
  const currentYear = calendarYearFromPeriod(current);
  if (index === 0) {
    return currentYear;
  }
  const previous = periods[index - 1];
  if (!previous) {
    return null;
  }
  if (calendarYearFromPeriod(previous) !== currentYear) {
    return currentYear;
  }
  return null;
}

export function isCalendarYearBoundaryGap(
  previousPeriod: string,
  currentPeriod: string,
): boolean {
  const [previousYear, previousMonth] = previousPeriod.split("-").map(Number);
  const [currentYear, currentMonth] = currentPeriod.split("-").map(Number);
  if (
    !Number.isFinite(previousYear)
    || !Number.isFinite(previousMonth)
    || !Number.isFinite(currentYear)
    || !Number.isFinite(currentMonth)
  ) {
    return false;
  }
  return previousMonth === 12 && currentMonth === 1 && currentYear === previousYear + 1;
}

export function slotTooltipLabel(
  period: string,
  segment: CompositionBarSegment,
  slotIndex: number,
): string {
  const header = `${formatPeriodLabel(period)}:`;
  if (segment.isMissing || segment.country === UNKNOWN_COUNTRY) {
    return `${header}\n${MISSING_SLOT_LABEL}`;
  }
  const title = segment.titles?.[slotIndex];
  if (!title) {
    return `${header}\n${MISSING_SLOT_LABEL}`;
  }
  return `${header}\n${title}`;
}

export function buildBarSegments(
  episode: CompositionEpisode,
  slotCapacity: number,
  colorMap: Record<string, string>,
  missingColor: string,
): CompositionBarSegment[] {
  const segments: CompositionBarSegment[] = episode.segments.map((segment) => ({
    country: segment.country,
    count: segment.count,
    widthPercent: (segment.count / slotCapacity) * 100,
    color:
      segment.country === UNKNOWN_COUNTRY
        ? missingColor
        : (colorMap[segment.country] ?? missingColor),
    isMissing: false,
    titles: segment.titles,
  }));

  if (episode.missing > 0) {
    segments.push({
      country: MISSING_COUNTRY,
      count: episode.missing,
      widthPercent: (episode.missing / slotCapacity) * 100,
      color: missingColor,
      isMissing: true,
    });
  }

  return segments;
}

export function yearsInComposition(
  episodes: YearCompositionEpisode[],
): string[] {
  const seen = new Set<string>();
  for (const episode of episodes) {
    for (const segment of episode.segments) {
      if (segment.year !== UNKNOWN_COUNTRY) {
        seen.add(segment.year);
      }
    }
  }
  return [...seen].sort((a, b) => Number(b) - Number(a));
}

export function yearEpisodesAsComposition(
  episodes: YearCompositionEpisode[],
): CompositionEpisode[] {
  return episodes.map((episode) => ({
    filled: episode.filled,
    missing: episode.missing,
    period: episode.period,
    segments: episode.segments.map((segment) => ({
      country: segment.year,
      count: segment.count,
      titles: segment.titles,
    })),
  }));
}
