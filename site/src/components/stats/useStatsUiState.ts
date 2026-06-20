import { useCallback, useEffect, useRef, useState } from "react";
import type { FilterState } from "./filters/types";
import {
  defaultStatsUiState,
  parseStatsUiState,
  serializeStatsUiState,
  type StatsUiState,
} from "./statsUiState";

export const STATS_URL_CHANGE_EVENT = "stats-url-change";

const RANGE_DEBOUNCE_MS = 200;

function dispatchUrlChange(search: string) {
  window.dispatchEvent(
    new CustomEvent(STATS_URL_CHANGE_EVENT, { detail: { search } }),
  );
}

function replaceUrlQuery(serialized: string) {
  const search = serialized ? `?${serialized}` : "";
  const url = `${window.location.pathname}${search}`;
  window.history.replaceState(null, "", url);
  dispatchUrlChange(search);
}

export type StatsUiStatePatch = {
  window?: Partial<StatsUiState["window"]>;
  filters?: FilterState | ((prev: FilterState) => FilterState);
};

function mergeUiState(prev: StatsUiState, patch: StatsUiStatePatch): StatsUiState {
  const window = patch.window
    ? { ...prev.window, ...patch.window }
    : prev.window;
  const filters =
    typeof patch.filters === "function"
      ? patch.filters(prev.filters)
      : patch.filters ?? prev.filters;
  return { window, filters };
}

export function useStatsUiState(periods: readonly string[]) {
  const [state, setState] = useState<StatsUiState>(() =>
    defaultStatsUiState(periods),
  );
  const hydratedRef = useRef(false);
  const rangeDebounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (periods.length === 0) {
      return;
    }
    if (!hydratedRef.current) {
      setState(parseStatsUiState(window.location.search, periods));
      hydratedRef.current = true;
    }
  }, [periods]);

  const syncUrl = useCallback(
    (next: StatsUiState, immediate = true) => {
      if (periods.length === 0) {
        return;
      }
      const write = () => {
        replaceUrlQuery(serializeStatsUiState(next, periods));
      };
      if (immediate) {
        clearTimeout(rangeDebounceRef.current);
        write();
        return;
      }
      clearTimeout(rangeDebounceRef.current);
      rangeDebounceRef.current = setTimeout(write, RANGE_DEBOUNCE_MS);
    },
    [periods],
  );

  useEffect(
    () => () => {
      clearTimeout(rangeDebounceRef.current);
    },
    [],
  );

  const patchUiState = useCallback(
    (patch: StatsUiStatePatch, options?: { debounceUrl?: boolean }) => {
      setState((prev) => {
        const next = mergeUiState(prev, patch);
        syncUrl(next, !options?.debounceUrl);
        return next;
      });
    },
    [syncUrl],
  );

  const setWindow = useCallback(
    (begin: string, end: string) => {
      patchUiState({ window: { begin, end } }, { debounceUrl: true });
    },
    [patchUiState],
  );

  const updateFilters = useCallback(
    (updater: (prev: FilterState) => FilterState) => {
      patchUiState({ filters: updater });
    },
    [patchUiState],
  );

  return {
    window: state.window,
    filters: state.filters,
    setWindow,
    updateFilters,
  };
}
