import type { SortingState } from "@tanstack/react-table";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { loadQueryData, type QueryData } from "./data";
import { applyFilters } from "./filters/applyFilters";
import { filterDefsForGrain } from "./filters/defs";
import { FilterBar } from "./filters/FilterBar";
import type { FilterState, FilterValue } from "./filters/types";
import { hasActiveFilters } from "./filters/types";
import { PeriodControls } from "./PeriodControls";
import { querySongWindow, queryVideoWindow } from "./queryWindow";
import { DEFAULT_SONG_SORT, DEFAULT_VIDEO_SORT, buildOriginalRanks, formatPeriodLabel } from "./sort";
import { StatsTable } from "./StatsTable";
import type { SongStatsRow, StatsGrain, VideoStatsRow } from "./types";

type StatsExplorerProps = {
  grain: StatsGrain;
};

const GRAIN_LABEL: Record<StatsGrain, string> = {
  video: "videos",
  song: "songs",
};

export function StatsExplorer({ grain }: StatsExplorerProps) {
  const defaultSort = grain === "video" ? DEFAULT_VIDEO_SORT : DEFAULT_SONG_SORT;

  const [periods, setPeriods] = useState<string[]>([]);
  const [begin, setBegin] = useState("");
  const [end, setEnd] = useState("");
  const [queryData, setQueryData] = useState<QueryData | null>(null);
  const [sorting, setSorting] = useState<SortingState>(defaultSort);
  const [userSorted, setUserSorted] = useState(false);
  const [filterState, setFilterState] = useState<FilterState>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setBegin(nextPeriods[0]);
        setEnd(nextPeriods[nextPeriods.length - 1]);
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
      filterState,
      filterDefs,
    ) as typeof baseRows;
  }, [baseRows, filterState, filterDefs]);

  const filtersActive = hasActiveFilters(filterState);

  const originalRanks = useMemo(() => {
    if (!filtersActive) {
      return undefined;
    }
    return buildOriginalRanks(baseRows, sorting, grain);
  }, [baseRows, sorting, grain, filtersActive]);

  const handleSortingChange = useCallback<Dispatch<SetStateAction<SortingState>>>(
    (updater) => {
      setUserSorted(true);
      setSorting(updater);
    },
    [],
  );

  const handleRangeChange = useCallback(
    (nextBegin: string, nextEnd: string) => {
      setBegin(nextBegin);
      setEnd(nextEnd);
      if (!userSorted) {
        setSorting(defaultSort);
      }
    },
    [defaultSort, userSorted],
  );

  const handleAddFilter = useCallback((filterId: string, value: FilterValue) => {
    setFilterState((prev) => {
      const current = prev[filterId] ?? [];
      if (current.includes(value)) {
        return prev;
      }
      return { ...prev, [filterId]: [...current, value] };
    });
  }, []);

  const handleRemoveFilter = useCallback((filterId: string, value: FilterValue) => {
    setFilterState((prev) => {
      const current = prev[filterId] ?? [];
      const next = current.filter((item) => item !== value);
      if (next.length === 0) {
        const { [filterId]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [filterId]: next };
    });
  }, []);

  const handleSetExclusiveFilter = useCallback(
    (filterId: string, value: FilterValue | null) => {
      setFilterState((prev) => {
        if (value === null) {
          const { [filterId]: _removed, ...rest } = prev;
          return rest;
        }
        return { ...prev, [filterId]: [value] };
      });
    },
    [],
  );

  if (error && !queryData) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
        {error}
      </p>
    );
  }

  const rangeLabel =
    begin && end
      ? `${formatPeriodLabel(begin)} – ${formatPeriodLabel(end)}`
      : "";

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
        state={filterState}
        disabled={loading || baseRows.length === 0}
        onAdd={handleAddFilter}
        onRemove={handleRemoveFilter}
        onSetExclusive={handleSetExclusiveFilter}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-text-muted">
        <p>
          {countLabel} {GRAIN_LABEL[grain]}
          {rangeLabel ? ` · window ${rangeLabel}` : ""}
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
