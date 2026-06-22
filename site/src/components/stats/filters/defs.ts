import type { StatsGrain, StatsRow } from "../types";
import {
  ESC_NON_ENTRIES,
  ESC_NOT_WINNERS,
  ESC_WINNERS,
  escMatch,
} from "./esc";
import { FIRE_FILTER_ON } from "./fireFilter";
import { SEARCH_FILTER_ID, searchFilterMatch } from "./searchFilterMatch";
import type {
  FilterDefinition,
  FilterableRow,
  FilterOption,
  VideoFilterableRow,
} from "./types";

const PERFORMANCE_CATEGORY_LABELS: Record<string, string> = {
  final_live: "Final (LIVE)",
  national_final: "National final",
  official_video: "Official video",
  special: "Special",
};

const PERFORMANCE_CATEGORY_TITLES: Partial<Record<string, string>> = {
  final_live: "Both semi-final and grand-final",
};

const PERFORMANCE_CATEGORY_ORDER = [
  "final_live",
  "national_final",
  "official_video",
  "special",
] as const;

export type FilterScope = "shared" | "video" | "song";

export const FILTER_SCOPES: Record<string, FilterScope> = {
  country: "shared",
  esc: "shared",
  fire: "shared",
  performance_category: "video",
  search: "shared",
  year: "shared",
};

function countryOptions(rows: FilterableRow[]): FilterOption[] {
  const byCountry = new Map<string, FilterOption>();
  for (const row of rows) {
    if (!row.country) {
      continue;
    }
    if (!byCountry.has(row.country)) {
      byCountry.set(row.country, {
        value: row.country,
        label: row.country,
        flag: row.flag ?? undefined,
      });
    }
  }
  return [...byCountry.values()].sort((a, b) => a.label.localeCompare(b.label));
}

function yearOptions(rows: FilterableRow[]): FilterOption[] {
  const years = new Set<number>();
  for (const row of rows) {
    if (typeof row.year === "number") {
      years.add(row.year);
    }
  }
  return [...years]
    .sort((a, b) => b - a)
    .map((year) => ({ value: year, label: String(year) }));
}

function performanceCategoryOptions(_rows: VideoFilterableRow[]): FilterOption[] {
  return PERFORMANCE_CATEGORY_ORDER.map((value) => ({
    value,
    label: PERFORMANCE_CATEGORY_LABELS[value] ?? value,
    title: PERFORMANCE_CATEGORY_TITLES[value],
  }));
}

const FIRE_DEF: FilterDefinition<FilterableRow> = {
  id: "fire",
  type: "toggle",
  label: "Songs related to fire",
  showChips: false,
  getOptions: () => [{ value: FIRE_FILTER_ON, label: "Songs related to fire" }],
  match: (row, selected) => row.fire && selected.includes(FIRE_FILTER_ON),
};

function searchFilterDef(grain: StatsGrain): FilterDefinition<FilterableRow> {
  return {
    id: SEARCH_FILTER_ID,
    type: "text",
    label: "Search",
    showChips: false,
    getOptions: () => [],
    match: (row, selected) => searchFilterMatch(row as StatsRow, grain, selected),
  };
}

const SHARED_FILTER_DEFS: FilterDefinition<FilterableRow>[] = [
  {
    id: "esc",
    type: "enum-exclusive",
    label: "ESC Place",
    showChips: false,
    getOptions: () => [
      { value: ESC_WINNERS, label: "Winners only" },
      { value: ESC_NOT_WINNERS, label: "Not winners" },
      { value: ESC_NON_ENTRIES, label: "Non-entries" },
    ],
    match: (row, selected) => escMatch(row.esc_final_place, selected),
  },
  FIRE_DEF,
  {
    id: "country",
    type: "enum-searchable",
    label: "Country",
    getOptions: countryOptions,
    match: (row, selected) =>
      !!row.country && (selected as string[]).includes(row.country),
  },
  {
    id: "year",
    type: "enum",
    label: "Year",
    getOptions: yearOptions,
    match: (row, selected) =>
      typeof row.year === "number" && (selected as number[]).includes(row.year),
  },
];

const PERFORMANCE_CATEGORY_DEF: FilterDefinition<VideoFilterableRow> = {
  id: "performance_category",
  type: "toggle-group",
  label: "Performance",
  showChips: false,
  getOptions: performanceCategoryOptions,
  match: (row, selected) =>
    !!row.performance_category &&
    (selected as string[]).includes(row.performance_category),
};

/** @deprecated use filterDefsForGrain */
export const STATS_FILTER_DEFS = SHARED_FILTER_DEFS;

export function filterDefsForGrain(
  grain: StatsGrain,
): FilterDefinition<FilterableRow>[] {
  const trailing = SHARED_FILTER_DEFS.slice(-2);
  const mid = SHARED_FILTER_DEFS.slice(0, -2);
  const defs = [searchFilterDef(grain), ...mid];
  if (grain === "video") {
    defs.push(PERFORMANCE_CATEGORY_DEF);
  }
  defs.push(...trailing);
  return defs;
}
