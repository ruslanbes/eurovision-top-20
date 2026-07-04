import { Fragment, useMemo } from "react";

import { monthAbbrevFromPeriod, yearLabelBeforeEpisode } from "./periodLabels";
import { ENTRY_CIRCLE } from "./constants";
import { EntryCell } from "./EntryCell";
import { entryTooltipLabel } from "./entryTooltip";
import { layoutEpisodeEntries } from "./entryLayout";
import type { BrowserEpisode } from "./types";
import type { EpisodeScheme, EpisodeSchemeContext } from "./schemes/types";

type EpisodeEntryGridProps = {
  episodes: BrowserEpisode[];
  scheme: EpisodeScheme;
  schemeContext: EpisodeSchemeContext;
  groupEnabled?: boolean;
  episodeGap?: boolean;
  focusedDimension?: string | null;
  onDimensionClick?: (dimensionKey: string) => void;
};

export function EpisodeEntryGrid({
  episodes,
  scheme,
  schemeContext,
  groupEnabled = false,
  episodeGap = false,
  focusedDimension = null,
  onDimensionClick,
}: EpisodeEntryGridProps) {
  const periods = useMemo(
    () => episodes.map((episode) => episode.period),
    [episodes],
  );

  const interactive = onDimensionClick != null;

  return (
    <div
      className="w-full sm:max-w-[37.5rem]"
      role={interactive ? "group" : "img"}
      aria-label={`Episode entries by ${scheme.label.toLowerCase()}`}
    >
      {episodes.map((episode, index) => {
        const yearLabel = episodeGap
          ? yearLabelBeforeEpisode(index, periods)
          : null;
        const entries = layoutEpisodeEntries(
          episode.entries,
          groupEnabled,
          scheme.groupSortKey,
        );

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
                    style={{
                      color:
                        schemeContext.colorMap[yearLabel]
                        ?? schemeContext.missingColor,
                    }}
                    aria-hidden="true"
                  >
                    {ENTRY_CIRCLE}
                  </span>
                  {yearLabel}
                </span>
                <span className="h-px min-w-0 flex-1 bg-border" aria-hidden="true" />
              </div>
            ) : null}
            <div className="flex h-6 w-full items-center gap-2">
              <span
                className="w-8 shrink-0 text-sm text-text-muted"
                aria-hidden="true"
              >
                {monthAbbrevFromPeriod(episode.period)}
              </span>
              <div className="flex min-w-0 flex-1">
              {entries.map((entry) => {
                const dimensionKey = scheme.dimensionKey(entry);
                const color = scheme.entryColor(entry, schemeContext);
                const glyph = scheme.entryGlyph(entry);
                const tooltip = entryTooltipLabel(entry);

                if (!interactive) {
                  return (
                    <span
                      key={`${episode.period}-${entry.rank}`}
                      title={tooltip}
                      className="flex flex-1 cursor-default select-none items-center justify-center leading-none"
                      aria-hidden="true"
                    >
                      <span
                        className="cursor-default select-none text-base"
                        style={{ color }}
                      >
                        {glyph}
                      </span>
                    </span>
                  );
                }

                return (
                  <EntryCell
                    key={`${episode.period}-${entry.rank}`}
                    color={color}
                    dimensionKey={dimensionKey}
                    focusedDimension={focusedDimension ?? null}
                    onDimensionClick={onDimensionClick}
                    glyph={glyph}
                    title={tooltip}
                    ariaLabel={tooltip}
                    className="flex flex-1 items-center justify-center leading-none"
                  />
                );
              })}
              </div>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
