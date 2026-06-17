import type { SortingState } from "@tanstack/react-table";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useState } from "react";
import { loadPeriodManifest, loadVideoSnapshot } from "./data";
import { PeriodControls } from "./PeriodControls";
import { DEFAULT_VIDEO_SORT } from "./sort";
import { StatsTable } from "./StatsTable";
import type { VideoStatsRow } from "./types";

export function StatsExplorer() {
  const [periods, setPeriods] = useState<string[]>([]);
  const [period, setPeriod] = useState<string>("");
  const [rows, setRows] = useState<VideoStatsRow[]>([]);
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_VIDEO_SORT);
  const [userSorted, setUserSorted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const manifest = await loadPeriodManifest();
        if (cancelled) {
          return;
        }
        setPeriods(manifest.periods);
        setPeriod(manifest.latest);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load periods");
          setLoading(false);
        }
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!period) {
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const snapshot = await loadVideoSnapshot(period);
        if (cancelled) {
          return;
        }
        setRows(snapshot.rows);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load stats");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [period]);

  const handleSortingChange = useCallback<Dispatch<SetStateAction<SortingState>>>((updater) => {
    setUserSorted(true);
    setSorting(updater);
  }, []);

  const handlePeriodChange = useCallback(
    (nextPeriod: string) => {
      setPeriod(nextPeriod);
      if (!userSorted) {
        setSorting(DEFAULT_VIDEO_SORT);
      }
    },
    [userSorted],
  );

  if (error && periods.length === 0) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
        {error}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <PeriodControls
        periods={periods}
        period={period}
        onPeriodChange={handlePeriodChange}
        disabled={loading}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-600 dark:text-zinc-400">
        <p>
          {rows.length} videos
          {period ? ` · data through ${period}` : ""}
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
          rows={rows}
          sorting={sorting}
          onSortingChange={handleSortingChange}
        />
      ) : null}
    </div>
  );
}
