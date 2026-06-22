import type { SortingState } from "@tanstack/react-table";

export type TableSort = {
  column: string;
  desc: boolean;
};

export const DEFAULT_TABLE_SORT_COLUMN = "chart_points";
export const DEFAULT_TABLE_SORT_DESC = true;

export const URL_SORT_COLUMNS = new Set([
  "chart_points",
  "country",
  "esc_final_place",
  "title",
  "top1",
  "top10",
  "top20",
  "top3",
  "top5",
  "year",
]);

export function isDefaultTableSort(sort: TableSort | null): boolean {
  if (!sort) {
    return true;
  }
  return (
    sort.column === DEFAULT_TABLE_SORT_COLUMN && sort.desc === DEFAULT_TABLE_SORT_DESC
  );
}

export function parseUrlSort(
  sortParam: string | null,
  orderParam: string | null,
): TableSort | null {
  if (!sortParam || !orderParam) {
    return null;
  }

  const column = sortParam.trim();
  if (!URL_SORT_COLUMNS.has(column)) {
    return null;
  }

  const order = orderParam.trim().toLowerCase();
  if (order !== "asc" && order !== "desc") {
    return null;
  }

  const parsed: TableSort = { column, desc: order === "desc" };
  if (isDefaultTableSort(parsed)) {
    return null;
  }

  return parsed;
}

export function serializeUrlSort(sort: TableSort | null): {
  sort?: string;
  order?: string;
} {
  if (!sort || isDefaultTableSort(sort)) {
    return {};
  }
  return {
    order: sort.desc ? "desc" : "asc",
    sort: sort.column,
  };
}

export function tableSortToSortingState(sort: TableSort | null): SortingState {
  if (!sort) {
    return [{ id: DEFAULT_TABLE_SORT_COLUMN, desc: DEFAULT_TABLE_SORT_DESC }];
  }
  return [{ id: sort.column, desc: sort.desc }];
}

export function sortingStateToTableSort(sorting: SortingState): TableSort | null {
  const primary = sorting[0];
  if (!primary?.id || !URL_SORT_COLUMNS.has(primary.id)) {
    return null;
  }
  const candidate: TableSort = { column: primary.id, desc: primary.desc };
  if (isDefaultTableSort(candidate)) {
    return null;
  }
  return candidate;
}
