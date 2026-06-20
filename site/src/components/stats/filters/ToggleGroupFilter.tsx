import type { FilterOption, FilterValue } from "./types";

type ToggleGroupFilterProps = {
  label: string;
  options: FilterOption[];
  selected: readonly FilterValue[];
  disabled?: boolean;
  onToggle: (value: FilterValue, active: boolean) => void;
};

export function ToggleGroupFilter({
  label,
  options,
  selected,
  disabled = false,
  onToggle,
}: ToggleGroupFilterProps) {
  return (
    <div className="space-y-1">
      <span className="text-xs font-medium text-text-muted">{label}</span>
      <div
        aria-label={label}
        className="flex flex-wrap gap-0.5 rounded-lg border border-border bg-surface-elevated p-0.5"
        role="group"
      >
        {options.map((option) => {
          const isActive = selected.includes(option.value);
          return (
            <button
              key={String(option.value)}
              type="button"
              aria-pressed={isActive}
              disabled={disabled}
              className={[
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                isActive
                  ? "bg-surface text-text shadow-sm"
                  : "text-text-muted hover:text-text",
              ].join(" ")}
              onClick={() => onToggle(option.value, !isActive)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
