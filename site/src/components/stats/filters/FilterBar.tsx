import { useMemo } from "react";
import { CountryFilter } from "./CountryFilter";
import { EnumSelectFilter } from "./EnumSelectFilter";
import { EscFilter } from "./EscFilter";
import { FireToggleFilter } from "./FireToggleFilter";
import { SearchFilter } from "./SearchFilter";
import { SEARCH_FILTER_ID } from "./searchFilterMatch";
import { FIRE_FILTER_ON } from "./fireFilter";
import { ToggleGroupFilter } from "./ToggleGroupFilter";
import type { EscMode } from "./esc";
import { filterDefsForGrain } from "./defs";
import type {
  FilterDefinition,
  FilterState,
  FilterValue,
  FilterableRow,
} from "./types";
import { optionByValue } from "./types";
import type { StatsGrain } from "../types";

type FilterBarProps<TRow extends FilterableRow> = {
  grain: StatsGrain;
  rows: TRow[];
  state: FilterState;
  disabled?: boolean;
  onAdd: (filterId: string, value: FilterValue) => void;
  onRemove: (filterId: string, value: FilterValue) => void;
  onSetExclusive: (filterId: string, value: FilterValue | null) => void;
  onSearchChange: (value: string) => void;
  defs?: readonly FilterDefinition<TRow>[];
};

type Chip = {
  filterId: string;
  value: FilterValue;
  label: string;
  flag?: string;
};

export function FilterBar<TRow extends FilterableRow>({
  grain,
  rows,
  state,
  disabled = false,
  onAdd,
  onRemove,
  onSetExclusive,
  onSearchChange,
  defs = filterDefsForGrain(grain) as FilterDefinition<TRow>[],
}: FilterBarProps<TRow>) {
  const optionsByFilter = useMemo(() => {
    const map = new Map<string, ReturnType<FilterDefinition<TRow>["getOptions"]>>();
    for (const def of defs) {
      map.set(def.id, def.getOptions(rows));
    }
    return map;
  }, [defs, rows]);

  const chips = useMemo(() => {
    const next: Chip[] = [];
    for (const def of defs) {
      if (def.showChips === false) {
        continue;
      }
      const selected = state[def.id] ?? [];
      const options = optionsByFilter.get(def.id) ?? [];
      for (const value of selected) {
        const option = optionByValue(options, value);
        next.push({
          filterId: def.id,
          value,
          label: option?.label ?? String(value),
          flag: option?.flag,
        });
      }
    }
    return next;
  }, [defs, optionsByFilter, state]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        {defs.map((def) => {
          const selected = state[def.id] ?? [];
          const options = optionsByFilter.get(def.id) ?? [];

          if (def.type === "text" && def.id === SEARCH_FILTER_ID) {
            const query = state[SEARCH_FILTER_ID]?.[0];
            return (
              <SearchFilter
                key={def.id}
                value={typeof query === "string" ? query : ""}
                disabled={disabled}
                onChange={onSearchChange}
              />
            );
          }

          if (def.type === "enum-searchable" && def.id === "country") {
            return (
              <CountryFilter
                key={def.id}
                options={options}
                selected={selected}
                disabled={disabled}
                onSelect={(value) => onAdd(def.id, value)}
              />
            );
          }

          if (def.type === "enum") {
            return (
              <EnumSelectFilter
                key={def.id}
                label={def.label}
                options={options}
                selected={selected}
                disabled={disabled}
                onSelect={(value) => onAdd(def.id, value)}
                parseValue={
                  def.id === "year" ? (raw) => Number(raw) : (raw) => raw
                }
              />
            );
          }

          if (def.type === "toggle" && def.id === "fire") {
            return (
              <FireToggleFilter
                key={def.id}
                selected={selected}
                disabled={disabled}
                onChange={(active) =>
                  onSetExclusive(def.id, active ? FIRE_FILTER_ON : null)
                }
              />
            );
          }

          if (def.type === "toggle-group") {
            return (
              <ToggleGroupFilter
                key={def.id}
                label={def.label}
                options={options}
                selected={selected}
                disabled={disabled}
                onToggle={(value, active) => {
                  if (active) {
                    onAdd(def.id, value);
                  } else {
                    onRemove(def.id, value);
                  }
                }}
              />
            );
          }

          if (def.type === "enum-exclusive" && def.id === "esc") {
            return (
              <EscFilter
                key={def.id}
                label={def.label}
                options={options}
                selected={selected}
                disabled={disabled}
                onChange={(value: EscMode | null) =>
                  onSetExclusive(def.id, value)
                }
              />
            );
          }

          return null;
        })}
      </div>

      {chips.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span
              key={`${chip.filterId}-${String(chip.value)}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-elevated px-2.5 py-1 text-sm text-text"
            >
              {chip.flag ? <span aria-hidden="true">{chip.flag}</span> : null}
              <span>{chip.label}</span>
              <button
                type="button"
                aria-label={`Remove ${chip.label}`}
                className="rounded-full px-1 text-text-muted hover:bg-surface hover:text-text"
                onClick={() => onRemove(chip.filterId, chip.value)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
