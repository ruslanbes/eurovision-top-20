export type FilterValue = string | number;

export type FilterOption = {
  value: FilterValue;
  label: string;
  title?: string;
  flag?: string;
};

export type FilterState = Partial<Record<string, readonly FilterValue[]>>;

export type FilterType =
  | "enum-searchable"
  | "enum"
  | "ternary"
  | "toggle-group"
  | "toggle"
  | "text"
  | "range";

export interface FilterDefinition<TRow> {
  id: string;
  type: FilterType;
  label: string;
  getOptions: (rows: TRow[]) => FilterOption[];
  match: (row: TRow, selected: readonly FilterValue[]) => boolean;
  /** When false, UI is self-contained (e.g. exclusive dropdown) — no chips. */
  showChips?: boolean;
}

export type FilterableRow = {
  country: string | null;
  esc_final_place: number | string | null;
  fire: boolean;
  flag: string | null;
  year: number | null;
};

export type VideoFilterableRow = FilterableRow & {
  performance_category: string | null;
};

import { searchFilterActive } from "./normalizeSearchText";
import { SEARCH_FILTER_ID } from "./searchFilterMatch";

export function hasActiveFilters(state: FilterState): boolean {
  return Object.entries(state).some(([filterId, values]) => {
    if (!values || values.length === 0) {
      return false;
    }
    if (filterId === SEARCH_FILTER_ID) {
      return searchFilterActive(values);
    }
    return true;
  });
}

export function optionByValue(
  options: FilterOption[],
  value: FilterValue,
): FilterOption | undefined {
  return options.find((option) => option.value === value);
}
