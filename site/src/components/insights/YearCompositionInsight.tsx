import { useEffect, useMemo, useState } from "react";
import { loadYearCompositionData } from "./data";
import {
  CompositionLegend,
  EpisodeCompositionChart,
} from "./EpisodeCompositionChart";
import {
  yearEpisodesAsComposition,
  yearsInComposition,
} from "./episodeComposition";
import { useDimensionFocus } from "./useDimensionFocus";

function missingColor(): string {
  if (typeof document === "undefined") {
    return "rgb(212 212 216)";
  }
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue("--chart-missing")
    .trim();
  return value ? `rgb(${value.replace(/ /g, ", ")})` : "rgb(212 212 216)";
}

export function YearCompositionInsight() {
  const { focusedDimension, handleDimensionClick } = useDimensionFocus();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [composition, setComposition] = useState<Awaited<
    ReturnType<typeof loadYearCompositionData>
  > | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      setError(null);
      try {
        const data = await loadYearCompositionData();
        if (!cancelled) {
          setComposition(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load insight data");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  const colorMap = useMemo(() => {
    if (!composition) {
      return {};
    }
    const map: Record<string, string> = {};
    for (const [year, entry] of Object.entries(composition.colors.colors)) {
      map[year] = entry.hex;
    }
    return map;
  }, [composition]);

  const legendYears = useMemo(() => {
    if (!composition) {
      return [];
    }
    return yearsInComposition(composition.composition.episodes);
  }, [composition]);

  const chartEpisodes = useMemo(() => {
    if (!composition) {
      return [];
    }
    return yearEpisodesAsComposition(composition.composition.episodes);
  }, [composition]);

  if (loading) {
    return <p className="text-sm text-text-muted">Loading…</p>;
  }

  if (error || !composition) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
        {error ?? "Insight data unavailable"}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-text-muted">
        Each row is one Top 20 episode. Each ● is one slot.
      </p>

      <CompositionLegend
        countries={legendYears}
        colorMap={colorMap}
        missingColor={missingColor()}
        focusedDimension={focusedDimension}
        onDimensionClick={handleDimensionClick}
      />

      <EpisodeCompositionChart
        episodes={chartEpisodes}
        slotCapacity={composition.composition.slot_capacity}
        colorMap={colorMap}
        missingColor={missingColor()}
        dimensionLabel="Contest year"
        episodeGap
        slotStyle="circle"
        focusedDimension={focusedDimension}
        onDimensionClick={handleDimensionClick}
      />
    </div>
  );
}
