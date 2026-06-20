import {
  ESC_NON_ENTRIES,
  ESC_NOT_WINNERS,
  ESC_WINNERS,
  type EscMode,
} from "./esc";
import type { FilterValue } from "./types";

type EscFilterProps = {
  label: string;
  selected: readonly FilterValue[];
  disabled?: boolean;
  onChange: (value: EscMode | null) => void;
};

type Segment = {
  value: EscMode | null;
  label: string;
};

const SEGMENTS: Segment[] = [
  { value: null, label: "All" },
  { value: ESC_WINNERS, label: "Winners" },
  { value: ESC_NOT_WINNERS, label: "Not winners" },
  { value: ESC_NON_ENTRIES, label: "Non-entries" },
];

export function EscFilter({
  label,
  selected,
  disabled = false,
  onChange,
}: EscFilterProps) {
  const active =
    selected[0] === ESC_WINNERS ||
    selected[0] === ESC_NOT_WINNERS ||
    selected[0] === ESC_NON_ENTRIES
      ? (selected[0] as EscMode)
      : null;

  return (
    <div className="space-y-1">
      <span className="text-xs font-medium text-text-muted">{label}</span>
      <div
        aria-label={label}
        className="flex flex-wrap gap-0.5 rounded-lg border border-border bg-surface-elevated p-0.5"
        role="radiogroup"
      >
        {SEGMENTS.map((segment) => {
          const isActive = active === segment.value;
          return (
            <button
              key={segment.label}
              type="button"
              role="radio"
              aria-checked={isActive}
              disabled={disabled}
              className={[
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                isActive
                  ? "bg-surface text-text shadow-sm"
                  : "text-text-muted hover:text-text",
              ].join(" ")}
              onClick={() => onChange(segment.value)}
            >
              {segment.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
