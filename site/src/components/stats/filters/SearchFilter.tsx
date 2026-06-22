import { useId } from "react";

type SearchFilterProps = {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

export function SearchFilter({
  value,
  disabled = false,
  onChange,
}: SearchFilterProps) {
  const inputId = useId();

  return (
    <div className="min-w-[12rem] flex-1 sm:max-w-md">
      <label htmlFor={inputId} className="sr-only">
        Search titles
      </label>
      <input
        id={inputId}
        type="search"
        enterKeyHint="search"
        placeholder="Search titles…"
        value={value}
        disabled={disabled}
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
