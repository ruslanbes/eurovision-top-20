import { Fragment, useMemo } from "react";
import {
  MISSING_COUNTRY,
  buildBarSegments,
  slotTooltipLabel,
  yearLabelBeforeEpisode,
  type CompositionEpisode,
} from "./episodeComposition";

type SlotStyle = "bar" | "circle";

type EpisodeCompositionChartProps = {
  episodes: CompositionEpisode[];
  slotCapacity: number;
  colorMap: Record<string, string>;
  missingColor: string;
  dimensionLabel: string;
  episodeGap?: boolean;
  slotStyle?: SlotStyle;
};

const SLOT_CIRCLE = "\u25cf";

function SegmentSlots({
  segment,
  period,
  slotStyle,
}: {
  segment: ReturnType<typeof buildBarSegments>[number];
  period: string;
  slotStyle: SlotStyle;
}) {
  if (slotStyle === "circle") {
    return (
      <span
        className="flex h-6 min-w-0 shrink-0 cursor-default select-none items-center"
        style={{ width: `${segment.widthPercent}%` }}
      >
        {Array.from({ length: segment.count }, (_, index) => (
          <span
            key={`${segment.country}-${index}`}
            title={slotTooltipLabel(period, segment, index)}
            className="flex flex-1 cursor-default select-none items-center justify-center leading-none"
            aria-hidden="true"
          >
            <span
              className="cursor-default select-none text-base"
              style={{ color: segment.color }}
            >
              {SLOT_CIRCLE}
            </span>
          </span>
        ))}
      </span>
    );
  }

  return (
    <span
      className="h-full shrink-0"
      style={{
        width: `${segment.widthPercent}%`,
        backgroundColor: segment.color,
      }}
    />
  );
}

export function EpisodeCompositionChart({
  episodes,
  slotCapacity,
  colorMap,
  missingColor,
  dimensionLabel,
  episodeGap = false,
  slotStyle = "bar",
}: EpisodeCompositionChartProps) {
  const rows = useMemo(
    () =>
      episodes.map((episode) => ({
        episode,
        segments: buildBarSegments(
          episode,
          slotCapacity,
          colorMap,
          missingColor,
        ),
      })),
    [colorMap, episodes, missingColor, slotCapacity],
  );

  const periods = useMemo(
    () => rows.map(({ episode }) => episode.period),
    [rows],
  );

  return (
    <div
      className={[
        "w-full sm:max-w-[37.5rem]",
        slotStyle === "circle" ? "cursor-default select-none" : "",
      ].join(" ")}
      role="img"
      aria-label={`Episode composition by ${dimensionLabel.toLowerCase()}`}
    >
      {rows.map(({ episode, segments }, index) => {
        const yearLabel = episodeGap ? yearLabelBeforeEpisode(index, periods) : null;

        return (
          <Fragment key={episode.period}>
            {yearLabel ? (
              <div
                className={[
                  "mb-1 flex w-full items-center gap-2",
                  index > 0 ? "mt-3" : "",
                ].join(" ")}
              >
                <span className="inline-flex shrink-0 items-center gap-2 text-sm text-text">
                  <span
                    className="text-sm leading-none"
                    style={{ color: colorMap[yearLabel] ?? missingColor }}
                    aria-hidden="true"
                  >
                    {SLOT_CIRCLE}
                  </span>
                  {yearLabel}
                </span>
                <span className="h-px min-w-0 flex-1 bg-border" aria-hidden="true" />
              </div>
            ) : null}
            <div className={slotStyle === "circle" ? "flex h-6 w-full" : "flex h-3 w-full"}>
              {segments.map((segment) => (
                <SegmentSlots
                  key={`${episode.period}-${segment.country}`}
                  segment={segment}
                  period={episode.period}
                  slotStyle={slotStyle}
                />
              ))}
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

export function CompositionLegend({
  countries,
  colorMap,
}: {
  countries: string[];
  colorMap: Record<string, string>;
}) {
  if (countries.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-text select-none">
      {countries.map((country) => (
        <span key={country} className="inline-flex items-center gap-2">
          <span className="text-sm leading-none" style={{ color: colorMap[country] ?? "transparent" }} aria-hidden="true">
            {SLOT_CIRCLE}
          </span>
          {country}
        </span>
      ))}
      <span className="inline-flex items-center gap-2 text-text-muted">
        <span className="text-sm leading-none text-chart-missing" aria-hidden="true">
          {SLOT_CIRCLE}
        </span>
        Missing
      </span>
    </div>
  );
}

export { MISSING_COUNTRY };
