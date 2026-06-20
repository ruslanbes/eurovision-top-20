import type { FilterDefinition, FilterState } from "./types";

export function applyFilters<TRow>(
  rows: TRow[],
  state: FilterState,
  defs: readonly FilterDefinition<TRow>[],
): TRow[] {
  return rows.filter((row) =>
    defs.every((def) => {
      const selected = state[def.id];
      if (!selected || selected.length === 0) {
        return true;
      }
      return def.match(row, selected);
    }),
  );
}
