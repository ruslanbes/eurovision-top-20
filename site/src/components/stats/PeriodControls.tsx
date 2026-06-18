import * as Slider from "@radix-ui/react-slider";
import { useEffect, useRef } from "react";
import {
  findAnchorForWindowStart,
  formatPeriodLabel,
  formatPeriodRange,
  periodIndex,
} from "./sort";
import type { RecentWindow, StatsVariant } from "./types";

type PeriodControlsProps = {
  variant: StatsVariant;
  periods: string[];
  period: string;
  window?: RecentWindow | null;
  windowsByPeriod?: Record<string, RecentWindow>;
  onPeriodChange: (period: string) => void;
  disabled?: boolean;
};

const thumbClassName =
  "block h-4 w-4 rounded-full border border-blue-600 bg-white shadow focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-blue-400 dark:bg-zinc-950";

export function PeriodControls({
  variant,
  periods,
  period,
  window,
  windowsByPeriod,
  onPeriodChange,
  disabled = false,
}: PeriodControlsProps) {
  const maxIndex = Math.max(0, periods.length - 1);
  const anchorIndex = Math.max(0, periods.indexOf(period));
  const activeWindow = window ?? windowsByPeriod?.[period] ?? null;

  const isRecentRange = variant === "recent" && activeWindow;
  const firstIndex = isRecentRange
    ? periodIndex(activeWindow.first_period, periods)
    : 0;
  const lastIndex = isRecentRange
    ? periodIndex(activeWindow.last_period, periods)
    : anchorIndex;

  const sliderValue = isRecentRange ? [firstIndex, lastIndex] : [anchorIndex];
  const sliderDisabled = disabled || periods.length <= 1;
  const prevRangeRef = useRef<[number, number]>([firstIndex, lastIndex]);

  useEffect(() => {
    if (isRecentRange) {
      prevRangeRef.current = [firstIndex, lastIndex];
    }
  }, [firstIndex, isRecentRange, lastIndex]);

  function handleValueChange(value: number[]) {
    if (!isRecentRange) {
      const next = periods[value[0] ?? 0];
      if (next) {
        onPeriodChange(next);
      }
      return;
    }

    const startIdx = value[0] ?? 0;
    const endIdx = value[1] ?? startIdx;
    const [prevStartIdx, prevEndIdx] = prevRangeRef.current;

    if (endIdx !== prevEndIdx) {
      const next = periods[endIdx];
      if (next) {
        onPeriodChange(next);
      }
      return;
    }

    if (startIdx !== prevStartIdx) {
      const targetStart = periods[startIdx];
      if (targetStart && windowsByPeriod) {
        const anchor = findAnchorForWindowStart(
          targetStart,
          windowsByPeriod,
          periods,
        );
        if (anchor) {
          onPeriodChange(anchor);
        }
      }
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {variant === "recent" ? "Anchor month" : "Episode month"}:{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {period ? formatPeriodLabel(period) : "—"}
            </span>
          </p>
          {isRecentRange ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Data window:{" "}
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {formatPeriodRange(
                  activeWindow.first_period,
                  activeWindow.last_period,
                )}
              </span>
              <span className="text-zinc-500 dark:text-zinc-500">
                {" "}
                · {activeWindow.episode_count} episodes · {activeWindow.years}
                -year window
              </span>
            </p>
          ) : null}
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          {anchorIndex + 1} / {periods.length}
        </p>
      </div>

      <div className="space-y-2">
        <Slider.Root
          className="relative flex h-5 w-full touch-none select-none items-center"
          min={0}
          max={maxIndex}
          step={1}
          minStepsBetweenThumbs={isRecentRange ? 1 : 0}
          value={sliderValue}
          disabled={sliderDisabled}
          onValueChange={handleValueChange}
          aria-label={variant === "recent" ? "Data window" : "Episode month"}
        >
          <Slider.Track className="relative h-1.5 grow rounded-full bg-zinc-200 dark:bg-zinc-800">
            <Slider.Range className="absolute h-full rounded-full bg-blue-600 dark:bg-blue-500" />
          </Slider.Track>
          {isRecentRange ? (
            <>
              <Slider.Thumb
                className={thumbClassName}
                aria-label={`Window start (${formatPeriodLabel(activeWindow.first_period)})`}
              />
              <Slider.Thumb
                className={thumbClassName}
                aria-label={`Window end (${formatPeriodLabel(activeWindow.last_period)})`}
              />
            </>
          ) : (
            <Slider.Thumb
              className={thumbClassName}
              aria-label="Select episode month"
            />
          )}
        </Slider.Root>

        {periods.length > 1 ? (
          <div className="flex justify-between text-[11px] text-zinc-500 dark:text-zinc-500">
            <span>{formatPeriodLabel(periods[0])}</span>
            <span>{formatPeriodLabel(periods[periods.length - 1])}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
