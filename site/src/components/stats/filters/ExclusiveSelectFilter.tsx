import { useId } from "react";
import type { FilterOption, FilterValue } from "./types";

type ExclusiveSelectFilterProps = {
  label: string;
  options: FilterOption[];
  selected: readonly FilterValue[];
  disabled?: boolean;
  onChange: (value: string | null) => void;
};

export function ExclusiveSelectFilter({
  label,
  options,
  selected,
  disabled = false,
  onChange,
}: ExclusiveSelectFilterProps) {
  const selectId = useId();
  const current = selected[0];
  const active =
    current !== undefined &&
    options.some((option) => String(option.value) === String(current))
      ? String(current)
      : "";

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={selectId}
        className="block text-xs font-medium text-text-muted"
      >
        {label}
      </label>
      <select
        id={selectId}
        disabled={disabled}
        value={active}
        className="min-w-[3ch] max-w-[12rem] [field-sizing:content] w-auto rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
        onChange={(event) => {
          const raw = event.target.value;
          onChange(raw ? raw : null);
        }}
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={String(option.value)} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
