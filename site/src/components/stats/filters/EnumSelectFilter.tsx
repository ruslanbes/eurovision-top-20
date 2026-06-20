import { useId } from "react";
import type { FilterOption, FilterValue } from "./types";

type EnumSelectFilterProps = {
  label: string;
  options: FilterOption[];
  selected: readonly FilterValue[];
  disabled?: boolean;
  onSelect: (value: FilterValue) => void;
  parseValue?: (raw: string) => FilterValue;
};

export function EnumSelectFilter({
  label,
  options,
  selected,
  disabled = false,
  onSelect,
  parseValue = (raw) => raw,
}: EnumSelectFilterProps) {
  const selectId = useId();
  const available = options.filter((option) => !selected.includes(option.value));

  return (
    <div className="min-w-[8rem]">
      <label className="sr-only" htmlFor={selectId}>
        {label}
      </label>
      <select
        id={selectId}
        disabled={disabled || available.length === 0}
        value=""
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
        onChange={(event) => {
          const raw = event.target.value;
          if (!raw) {
            return;
          }
          onSelect(parseValue(raw));
        }}
      >
        <option value="">{label}</option>
        {available.map((option) => (
          <option key={String(option.value)} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
