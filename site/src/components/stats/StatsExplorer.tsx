import type { SortingState } from "@tanstack/react-table";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { loadQueryData, type QueryData } from "./data";
import { PeriodControls } from "./PeriodControls";
import { querySongWindow, queryVideoWindow } from "./queryWindow";
import { DEFAULT_SONG_SORT, DEFAULT_VIDEO_SORT, formatPeriodLabel } from "./sort";
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

  const rows = useMemo(() => {
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

  return (
    <div className="space-y-6">
      <PeriodControls
        periods={periods}
        begin={begin}
        end={end}
        onRangeChange={handleRangeChange}
        disabled={loading}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-600 dark:text-zinc-400">
        <p>
          {rows.length} {GRAIN_LABEL[grain]}
          {rangeLabel ? ` · window ${rangeLabel}` : ""}
        </p>
        {loading ? <p>Loading…</p> : null}
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      ) : null}

      {!loading && rows.length > 0 ? (
        <StatsTable
          grain={grain}
          rows={rows}
          sorting={sorting}
          onSortingChange={handleSortingChange}
        />
      ) : null}

      {!loading && !error && rows.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No {GRAIN_LABEL[grain]} with chart activity in this range.
        </p>
      ) : null}
    </div>
  );
}
