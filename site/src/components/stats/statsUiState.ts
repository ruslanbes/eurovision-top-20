import {
  ESC_NON_ENTRIES,
  ESC_NOT_WINNERS,
  ESC_WINNERS,
  type EscMode,
} from "./filters/esc";
import { FIRE_FILTER_ON } from "./filters/fireFilter";
import { SEARCH_FILTER_ID } from "./filters/searchFilterMatch";
import type { FilterState, FilterValue } from "./filters/types";
import {
  parseUrlSort,
  serializeUrlSort,
  type TableSort,
} from "./sortUrl";

export type StatsUiState = {
  window: { begin: string; end: string };
  filters: FilterState;
  sort: TableSort | null;
};

export const STATS_URL_PARAMS = [
  "begin",
  "country",
  "end",
  "esc",
  "fire",
  "order",
  "performance_category",
  "q",
  "sort",
  "year",
] as const;

const PERFORMANCE_CATEGORY_VALUES = new Set([
  "final_live",
  "national_final",
  "official_video",
  "special",
]);

const ESC_URL_VALUES: Record<string, EscMode> = {
  winners: ESC_WINNERS,
  not_winners: ESC_NOT_WINNERS,
  "not-winners": ESC_NOT_WINNERS,
  non_entries: ESC_NON_ENTRIES,
  "non-entries": ESC_NON_ENTRIES,
};

const ESC_TO_URL: Record<EscMode, string> = {
  [ESC_WINNERS]: "winners",
  [ESC_NOT_WINNERS]: "not_winners",
  [ESC_NON_ENTRIES]: "non_entries",
};

export function defaultStatsUiState(periods: readonly string[]): StatsUiState {
  if (periods.length === 0) {
    return { window: { begin: "", end: "" }, filters: {}, sort: null };
  }
  return {
    window: { begin: periods[0], end: periods[periods.length - 1] },
    filters: {},
    sort: null,
  };
}

function periodIndex(period: string, periods: readonly string[]): number {
  const index = periods.indexOf(period);
  return index >= 0 ? index : -1;
}

function clampPeriod(value: string, periods: readonly string[]): string | null {
  if (periods.includes(value)) {
    return value;
  }
  return null;
}

function nearestPeriod(value: string, periods: readonly string[]): string {
  if (periods.length === 0) {
    return value;
  }
  if (periods.includes(value)) {
    return value;
  }

  const match = value.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    return periods[0];
  }

  const target = Number(match[1]) * 12 + Number(match[2]);
  let best = periods[0];
  let bestDistance = Infinity;

  for (const period of periods) {
    const periodMatch = period.match(/^(\d{4})-(\d{2})$/);
    if (!periodMatch) {
      continue;
    }
    const candidate = Number(periodMatch[1]) * 12 + Number(periodMatch[2]);
    const distance = Math.abs(candidate - target);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = period;
    }
  }

  return best;
}

export function normalizeWindow(
  begin: string,
  end: string,
  periods: readonly string[],
): { begin: string; end: string } {
  const defaults = defaultStatsUiState(periods).window;
  if (periods.length === 0) {
    return defaults;
  }

  let nextBegin = clampPeriod(begin, periods) ?? nearestPeriod(begin, periods);
  let nextEnd = clampPeriod(end, periods) ?? nearestPeriod(end, periods);

  const beginIdx = periodIndex(nextBegin, periods);
  const endIdx = periodIndex(nextEnd, periods);
  if (beginIdx > endIdx) {
    [nextBegin, nextEnd] = [nextEnd, nextBegin];
  }

  return { begin: nextBegin, end: nextEnd };
}

function parseCommaList(raw: string): string[] {
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function parseYearList(raw: string): number[] {
  const values: number[] = [];
  for (const part of parseCommaList(raw)) {
    const year = Number(part);
    if (Number.isInteger(year) && year > 0) {
      values.push(year);
    }
  }
  return values;
}

function parsePerformanceCategoryList(raw: string): string[] {
  return parseCommaList(raw).filter((value) =>
    PERFORMANCE_CATEGORY_VALUES.has(value),
  );
}

function parseEscWinner(raw: string): EscMode | null {
  return ESC_URL_VALUES[raw.trim()] ?? null;
}

export function parseStatsUiState(
  search: string,
  periods: readonly string[],
): StatsUiState {
  const defaults = defaultStatsUiState(periods);
  const query = search.startsWith("?") ? search.slice(1) : search;
  if (!query || periods.length === 0) {
    return defaults;
  }

  const params = new URLSearchParams(query);
  const filters: FilterState = { ...defaults.filters };

  const beginParam = params.get("begin");
  const endParam = params.get("end");
  let window = defaults.window;
  if (beginParam && endParam) {
    window = normalizeWindow(beginParam, endParam, periods);
  } else if (beginParam) {
    window = normalizeWindow(
      beginParam,
      defaults.window.end,
      periods,
    );
  } else if (endParam) {
    window = normalizeWindow(
      defaults.window.begin,
      endParam,
      periods,
    );
  }

  const country = parseCommaList(params.get("country") ?? "");
  if (country.length > 0) {
    filters.country = country;
  }

  const years = parseYearList(params.get("year") ?? "");
  if (years.length > 0) {
    filters.year = years;
  }

  const escWinner = parseEscWinner(params.get("esc") ?? "");
  if (escWinner) {
    filters.esc = [escWinner];
  }

  const categories = parsePerformanceCategoryList(
    params.get("performance_category") ?? "",
  );
  if (categories.length > 0) {
    filters.performance_category = categories;
  }

  if (params.get("fire") === "1") {
    filters.fire = [FIRE_FILTER_ON];
  }

  const searchQuery = params.get("q")?.trim();
  if (searchQuery) {
    filters[SEARCH_FILTER_ID] = [searchQuery];
  }

  const sort = parseUrlSort(params.get("sort"), params.get("order"));

  return { window, filters, sort };
}

function appendCommaParam(
  parts: string[],
  key: string,
  values: readonly FilterValue[] | undefined,
) {
  if (!values || values.length === 0) {
    return;
  }
  parts.push(`${key}=${values.map(String).join(",")}`);
}

export function serializeStatsUiState(
  state: StatsUiState,
  periods: readonly string[],
): string {
  if (periods.length === 0) {
    return "";
  }

  const defaults = defaultStatsUiState(periods);
  const parts: string[] = [];

  if (state.window.begin !== defaults.window.begin) {
    parts.push(`begin=${encodeURIComponent(state.window.begin)}`);
  }
  if (state.window.end !== defaults.window.end) {
    parts.push(`end=${encodeURIComponent(state.window.end)}`);
  }

  appendCommaParam(parts, "country", state.filters.country);
  appendCommaParam(
    parts,
    "year",
    state.filters.year?.filter((value) => Number.isInteger(value)),
  );

  const escWinner = state.filters.esc?.[0];
  if (
    typeof escWinner === "string" &&
    escWinner in ESC_TO_URL
  ) {
    parts.push(
      `esc=${encodeURIComponent(ESC_TO_URL[escWinner as EscMode])}`,
    );
  }

  appendCommaParam(
    parts,
    "performance_category",
    state.filters.performance_category?.filter((value) =>
      PERFORMANCE_CATEGORY_VALUES.has(String(value)),
    ),
  );

  if (state.filters.fire?.includes(FIRE_FILTER_ON)) {
    parts.push("fire=1");
  }

  const searchQuery = state.filters[SEARCH_FILTER_ID]?.[0];
  if (typeof searchQuery === "string") {
    const trimmed = searchQuery.trim();
    if (trimmed) {
      parts.push(`q=${encodeURIComponent(trimmed)}`);
    }
  }

  const { order, sort } = serializeUrlSort(state.sort);
  if (sort && order) {
    parts.push(`order=${order}`);
    parts.push(`sort=${encodeURIComponent(sort)}`);
  }

  parts.sort();
  return parts.join("&");
}

export function statsUiStateSearch(state: StatsUiState, periods: readonly string[]): string {
  const serialized = serializeStatsUiState(state, periods);
  return serialized ? `?${serialized}` : "";
}
