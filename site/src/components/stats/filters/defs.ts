import type { StatsGrain } from "../types";
import {
  ESC_WINNER_NOT_WINNERS,
  ESC_WINNER_WINNERS,
  escWinnerMatch,
} from "./escWinner";
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

const PERFORMANCE_CATEGORY_ORDER = [
  "final_live",
  "national_final",
  "official_video",
  "special",
] as const;

export type FilterScope = "shared" | "video" | "song";

export const FILTER_SCOPES: Record<string, FilterScope> = {
  country: "shared",
  year: "shared",
  esc_winner: "shared",
  performance_category: "video",
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
  }));
}

const SHARED_FILTER_DEFS: FilterDefinition<FilterableRow>[] = [
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
  {
    id: "esc_winner",
    type: "ternary",
    label: "ESC winner",
    showChips: false,
    getOptions: () => [
      { value: ESC_WINNER_WINNERS, label: "Winners only" },
      { value: ESC_WINNER_NOT_WINNERS, label: "Not winners" },
    ],
    match: (row, selected) => escWinnerMatch(row.esc_final_place, selected),
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
  if (grain === "video") {
    return [...SHARED_FILTER_DEFS, PERFORMANCE_CATEGORY_DEF];
  }
  return SHARED_FILTER_DEFS;
}
