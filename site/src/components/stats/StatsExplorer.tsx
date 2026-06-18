import type { SortingState } from "@tanstack/react-table";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useState } from "react";
import { loadPeriodManifest, loadSongSnapshot, loadVideoSnapshot } from "./data";
import { PeriodControls } from "./PeriodControls";
import { DEFAULT_SONG_SORT, DEFAULT_VIDEO_SORT, formatPeriodRange } from "./sort";
import { StatsTable } from "./StatsTable";
import type {
  RecentWindow,
  SongStatsRow,
  StatsGrain,
  StatsVariant,
  VideoStatsRow,
} from "./types";

type StatsExplorerProps = {
  grain: StatsGrain;
  variant: StatsVariant;
};

const GRAIN_LABEL: Record<StatsGrain, string> = {
  video: "videos",
  song: "songs",
};

export function StatsExplorer({ grain, variant }: StatsExplorerProps) {
  const defaultSort = grain === "video" ? DEFAULT_VIDEO_SORT : DEFAULT_SONG_SORT;

  const [periods, setPeriods] = useState<string[]>([]);
  const [period, setPeriod] = useState<string>("");
  const [windowsByPeriod, setWindowsByPeriod] = useState<
    Record<string, RecentWindow>
  >({});
  const [window, setWindow] = useState<RecentWindow | null>(null);
  const [rows, setRows] = useState<VideoStatsRow[] | SongStatsRow[]>([]);
  const [sorting, setSorting] = useState<SortingState>(defaultSort);
  const [userSorted, setUserSorted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const manifest = await loadPeriodManifest(variant);
        if (cancelled) {
          return;
        }
        setPeriods(manifest.periods);
        setPeriod(manifest.latest);
        setWindowsByPeriod(manifest.windows ?? {});
        setWindow(manifest.windows?.[manifest.latest] ?? null);
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
  }, [variant]);

  useEffect(() => {
    if (!period) {
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const snapshot =
          grain === "video"
            ? await loadVideoSnapshot(variant, period)
            : await loadSongSnapshot(variant, period);
        if (cancelled) {
          return;
        }
        setRows(snapshot.rows);
        if (snapshot.window) {
          setWindow(snapshot.window);
        }
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
  }, [grain, period, variant]);

  const handleSortingChange = useCallback<Dispatch<SetStateAction<SortingState>>>(
    (updater) => {
      setUserSorted(true);
      setSorting(updater);
    },
    [],
  );

  const handlePeriodChange = useCallback(
    (nextPeriod: string) => {
      setPeriod(nextPeriod);
      setWindow(windowsByPeriod[nextPeriod] ?? null);
      if (!userSorted) {
        setSorting(defaultSort);
      }
    },
    [defaultSort, userSorted, windowsByPeriod],
  );

  const periodSummary =
    variant === "recent" && window
      ? formatPeriodRange(window.first_period, window.last_period)
      : period;

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
        variant={variant}
        periods={periods}
        period={period}
        window={window}
        windowsByPeriod={windowsByPeriod}
        onPeriodChange={handlePeriodChange}
        disabled={loading}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-600 dark:text-zinc-400">
        <p>
          {rows.length} {GRAIN_LABEL[grain]}
          {periodSummary
            ? variant === "recent"
              ? ` · window ${periodSummary}`
              : ` · data through ${period}`
            : ""}
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
    </div>
  );
}
