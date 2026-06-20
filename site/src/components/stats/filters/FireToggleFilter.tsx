import { FIRE_FILTER_ON } from "./fireFilter";
import type { FilterValue } from "./types";

type FireToggleFilterProps = {
  selected: readonly FilterValue[];
  disabled?: boolean;
  onChange: (active: boolean) => void;
};

export function FireToggleFilter({
  selected,
  disabled = false,
  onChange,
}: FireToggleFilterProps) {
  const active = selected.includes(FIRE_FILTER_ON);

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label="Songs related to fire"
      title="Songs related to fire"
      disabled={disabled}
      className={[
        "rounded-lg border border-border bg-surface-elevated px-2.5 py-1.5 text-xl leading-none transition-[filter,opacity] duration-150",
        "disabled:cursor-not-allowed disabled:opacity-50",
        active
          ? "opacity-100 saturate-100"
          : "opacity-35 saturate-0 hover:opacity-55",
      ].join(" ")}
      onClick={() => onChange(!active)}
    >
      <span aria-hidden="true">🔥</span>
    </button>
  );
}
