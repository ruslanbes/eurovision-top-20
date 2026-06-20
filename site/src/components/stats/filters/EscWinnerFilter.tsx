import {
  ESC_WINNER_NOT_WINNERS,
  ESC_WINNER_WINNERS,
  type EscWinnerMode,
} from "./escWinner";
import type { FilterValue } from "./types";

type EscWinnerFilterProps = {
  label: string;
  selected: readonly FilterValue[];
  disabled?: boolean;
  onChange: (value: EscWinnerMode | null) => void;
};

type Segment = {
  value: EscWinnerMode | null;
  label: string;
};

const SEGMENTS: Segment[] = [
  { value: null, label: "All" },
  { value: ESC_WINNER_WINNERS, label: "Winners" },
  { value: ESC_WINNER_NOT_WINNERS, label: "Not winners" },
];

export function EscWinnerFilter({
  label,
  selected,
  disabled = false,
  onChange,
}: EscWinnerFilterProps) {
  const active =
    selected[0] === ESC_WINNER_WINNERS || selected[0] === ESC_WINNER_NOT_WINNERS
      ? (selected[0] as EscWinnerMode)
      : null;

  return (
    <div className="space-y-1">
      <span className="text-xs font-medium text-text-muted">{label}</span>
      <div
        aria-label={label}
        className="flex gap-0.5 rounded-lg border border-border bg-surface-elevated p-0.5"
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
