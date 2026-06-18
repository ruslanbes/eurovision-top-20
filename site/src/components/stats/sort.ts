import type { SortingState } from "@tanstack/react-table";

export const DEFAULT_SONG_SORT: SortingState = [
  { id: "chart_points", desc: true },
  { id: "top1", desc: true },
  { id: "top3", desc: true },
  { id: "top5", desc: true },
  { id: "top10", desc: true },
  { id: "top20", desc: true },
  { id: "song_label", desc: false },
];

export const DEFAULT_VIDEO_SORT: SortingState = [
  { id: "chart_points", desc: true },
  { id: "top1", desc: true },
  { id: "top3", desc: true },
  { id: "top5", desc: true },
  { id: "top10", desc: true },
  { id: "top20", desc: true },
  { id: "video_title", desc: false },
];

export function formatPeriodLabel(period: string): string {
  const [year, month] = period.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleString("en-US", { month: "short", year: "numeric" });
}

export function formatPeriodRange(firstPeriod: string, lastPeriod: string): string {
  return `${formatPeriodLabel(firstPeriod)} – ${formatPeriodLabel(lastPeriod)}`;
}

export function periodIndex(period: string, periods: string[]): number {
  const index = periods.indexOf(period);
  return index >= 0 ? index : 0;
}

export function findAnchorForWindowStart(
  startPeriod: string,
  windowsByPeriod: Record<string, { first_period: string }>,
  periods: string[],
): string | undefined {
  const exact = periods.find(
    (anchor) => windowsByPeriod[anchor]?.first_period === startPeriod,
  );
  if (exact) {
    return exact;
  }

  const targetIndex = periodIndex(startPeriod, periods);
  let bestAnchor: string | undefined;
  let bestDistance = Infinity;

  for (const anchor of periods) {
    const windowMeta = windowsByPeriod[anchor];
    if (!windowMeta) {
      continue;
    }
    const distance = Math.abs(
      periodIndex(windowMeta.first_period, periods) - targetIndex,
    );
    if (distance < bestDistance) {
      bestDistance = distance;
      bestAnchor = anchor;
    }
  }

  return bestAnchor;
}
