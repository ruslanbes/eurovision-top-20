export type FilterValue = string | number;

export type FilterOption = {
  value: FilterValue;
  label: string;
  flag?: string;
};

export type FilterState = Partial<Record<string, readonly FilterValue[]>>;

export type FilterType =
  | "enum-searchable"
  | "enum"
  | "ternary"
  | "toggle-group"
  | "toggle"
  | "range";

export interface FilterDefinition<TRow> {
  id: string;
  type: FilterType;
  label: string;
  getOptions: (rows: TRow[]) => FilterOption[];
  match: (row: TRow, selected: readonly FilterValue[]) => boolean;
  /** When false, UI is self-contained (e.g. segmented control) — no chips. */
  showChips?: boolean;
}

export type FilterableRow = {
  country: string | null;
  flag: string | null;
  year: number | null;
  esc_final_place: number | string | null;
};

export type VideoFilterableRow = FilterableRow & {
  performance_category: string | null;
};

export function hasActiveFilters(state: FilterState): boolean {
  return Object.values(state).some((values) => values && values.length > 0);
}

export function optionByValue(
  options: FilterOption[],
  value: FilterValue,
): FilterOption | undefined {
  return options.find((option) => option.value === value);
}
