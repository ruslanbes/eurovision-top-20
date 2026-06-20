import type { SortingState } from "@tanstack/react-table";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { loadQueryData, type QueryData } from "./data";
import { applyFilters } from "./filters/applyFilters";
import { filterDefsForGrain } from "./filters/defs";
import { FilterBar } from "./filters/FilterBar";
import type { FilterValue } from "./filters/types";
import { hasActiveFilters } from "./filters/types";
import { PeriodControls } from "./PeriodControls";
import { querySongWindow, queryVideoWindow } from "./queryWindow";
import { DEFAULT_SONG_SORT, DEFAULT_TABLE_SORT, DEFAULT_VIDEO_SORT, buildOriginalRanks } from "./sort";
import { StatsTable } from "./StatsTable";
import type { SongStatsRow, StatsGrain, VideoStatsRow } from "./types";
import { useStatsUiState } from "./useStatsUiState";

type StatsExplorerProps = {
  grain: StatsGrain;
};

const GRAIN_LABEL: Record<StatsGrain, string> = {
  video: "videos",
  song: "songs",
};

export function StatsExplorer({ grain }: StatsExplorerProps) {
  const defaultRankSort = grain === "video" ? DEFAULT_VIDEO_SORT : DEFAULT_SONG_SORT;

  const [periods, setPeriods] = useState<string[]>([]);
  const [queryData, setQueryData] = useState<QueryData | null>(null);
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_TABLE_SORT);
  const [userSorted, setUserSorted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { window, filters, setWindow, updateFilters } = useStatsUiState(periods);
  const { begin, end } = window;

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      setError(null);
      try {
        const data = await loadQueryData(grain);
        if (cancelled) {
          return;
        }
        const nextPeriods = data.hits.periods;
        if (nextPeriods.length === 0) {
          throw new Error("Query index has no episode periods");
        }
        setQueryData(data);
        setPeriods(nextPeriods);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load query index");
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
  }, [grain]);

  const baseRows = useMemo(() => {
    if (!queryData || !begin || !end) {
      return [];
    }
    if (grain === "video") {
      return queryVideoWindow(
        queryData.hits,
        queryData.meta,
        begin,
        end,
      ) as VideoStatsRow[];
    }
    return querySongWindow(
      queryData.hits,
      queryData.meta,
      begin,
      end,
    ) as SongStatsRow[];
  }, [queryData, begin, end, grain]);

  const filterDefs = useMemo(() => filterDefsForGrain(grain), [grain]);

  const filteredRows = useMemo(() => {
    return applyFilters(
      baseRows,
      filters,
      filterDefs,
    ) as typeof baseRows;
  }, [baseRows, filters, filterDefs]);

  const filtersActive = hasActiveFilters(filters);

  const originalRanks = useMemo(() => {
    return buildOriginalRanks(baseRows, defaultRankSort, grain);
  }, [baseRows, defaultRankSort, grain]);

  const handleSortingChange = useCallback<Dispatch<SetStateAction<SortingState>>>(
    (updater) => {
      setUserSorted(true);
      setSorting(updater);
    },
    [],
  );

  const handleRangeChange = useCallback(
    (nextBegin: string, nextEnd: string) => {
      setWindow(nextBegin, nextEnd);
      if (!userSorted) {
        setSorting(DEFAULT_TABLE_SORT);
      }
    },
    [setWindow, userSorted],
  );

  const handleAddFilter = useCallback((filterId: string, value: FilterValue) => {
    updateFilters((prev) => {
      const current = prev[filterId] ?? [];
      if (current.includes(value)) {
        return prev;
      }
      return { ...prev, [filterId]: [...current, value] };
    });
  }, [updateFilters]);

  const handleRemoveFilter = useCallback((filterId: string, value: FilterValue) => {
    updateFilters((prev) => {
      const current = prev[filterId] ?? [];
      const next = current.filter((item) => item !== value);
      if (next.length === 0) {
        const { [filterId]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [filterId]: next };
    });
  }, [updateFilters]);

  const handleSetExclusiveFilter = useCallback(
    (filterId: string, value: FilterValue | null) => {
      updateFilters((prev) => {
        if (value === null) {
          const { [filterId]: _removed, ...rest } = prev;
          return rest;
        }
        return { ...prev, [filterId]: [value] };
      });
    },
    [updateFilters],
  );

  if (error && !queryData) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
        {error}
      </p>
    );
  }

  const countLabel =
    filtersActive && filteredRows.length !== baseRows.length
      ? `${filteredRows.length} of ${baseRows.length}`
      : String(filteredRows.length);

  return (
    <div className="space-y-6">
      <PeriodControls
        periods={periods}
        begin={begin}
        end={end}
        onRangeChange={handleRangeChange}
        disabled={loading}
      />

      <FilterBar
        grain={grain}
        rows={baseRows}
        state={filters}
        disabled={loading || baseRows.length === 0}
        onAdd={handleAddFilter}
        onRemove={handleRemoveFilter}
        onSetExclusive={handleSetExclusiveFilter}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-text-muted">
        <p>
          {countLabel} {GRAIN_LABEL[grain]}
        </p>
        {loading ? <p>Loading…</p> : null}
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      ) : null}

      {!loading && filteredRows.length > 0 ? (
        <StatsTable
          grain={grain}
          rows={filteredRows}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          originalRanks={originalRanks}
        />
      ) : null}

      {!loading && !error && baseRows.length === 0 ? (
        <p className="text-sm text-text-muted">
          No {GRAIN_LABEL[grain]} with chart activity in this range.
        </p>
      ) : null}

      {!loading && !error && baseRows.length > 0 && filteredRows.length === 0 ? (
        <p className="text-sm text-text-muted">
          No {GRAIN_LABEL[grain]} match the current filters.
        </p>
      ) : null}
    </div>
  );
}
