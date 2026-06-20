import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { FilterOption, FilterValue } from "./types";

type CountryFilterProps = {
  options: FilterOption[];
  selected: readonly FilterValue[];
  disabled?: boolean;
  onSelect: (value: FilterValue) => void;
};

export function CountryFilter({
  options,
  selected,
  disabled = false,
  onSelect,
}: CountryFilterProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const available = useMemo(
    () => options.filter((option) => !selected.includes(option.value)),
    [options, selected],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return available;
    }
    return available.filter((option) =>
      option.label.toLowerCase().startsWith(needle),
    );
  }, [available, query]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const pick = (value: FilterValue) => {
    onSelect(value);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative min-w-[12rem]">
      <label className="sr-only" htmlFor={`${listId}-input`}>
        Country
      </label>
      <input
        id={`${listId}-input`}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${listId}-listbox`}
        aria-autocomplete="list"
        disabled={disabled || available.length === 0}
        placeholder="Country"
        value={query}
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            return;
          }
          if (event.key === "Enter" && filtered[0]) {
            event.preventDefault();
            pick(filtered[0].value);
          }
        }}
      />
      {open && filtered.length > 0 ? (
        <ul
          id={`${listId}-listbox`}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-surface py-1 text-sm shadow-lg"
        >
          {filtered.map((option) => (
            <li key={String(option.value)} role="presentation">
              <button
                type="button"
                role="option"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-text hover:bg-surface-elevated"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(option.value)}
              >
                {option.flag ? <span aria-hidden="true">{option.flag}</span> : null}
                <span>{option.label}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
