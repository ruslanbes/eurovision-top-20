import { useId } from "react";
import {
  ESC_NON_ENTRIES,
  ESC_NOT_WINNERS,
  ESC_WINNERS,
  type EscMode,
} from "./esc";
import type { FilterOption, FilterValue } from "./types";

type EscFilterProps = {
  label: string;
  options: FilterOption[];
  selected: readonly FilterValue[];
  disabled?: boolean;
  onChange: (value: EscMode | null) => void;
};

const ESC_VALUES = new Set<string>([
  ESC_WINNERS,
  ESC_NOT_WINNERS,
  ESC_NON_ENTRIES,
]);

export function EscFilter({
  label,
  options,
  selected,
  disabled = false,
  onChange,
}: EscFilterProps) {
  const selectId = useId();
  const active =
    selected[0] !== undefined && ESC_VALUES.has(String(selected[0]))
      ? String(selected[0])
      : "";

  return (
    <div className="min-w-[8rem]">
      <label className="sr-only" htmlFor={selectId}>
        {label}
      </label>
      <select
        id={selectId}
        disabled={disabled}
        value={active}
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
        onChange={(event) => {
          const raw = event.target.value;
          onChange(raw ? (raw as EscMode) : null);
        }}
      >
        <option value="">{label}</option>
        {options.map((option) => (
          <option key={String(option.value)} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
