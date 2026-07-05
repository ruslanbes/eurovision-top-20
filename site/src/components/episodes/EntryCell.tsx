import type { CSSProperties, ReactNode } from "react";

import type { EntryHighlightState } from "./entryHighlight";
import { resolveEntryVisualState } from "./entryHighlight";
import { entryStyle } from "./entryFocus";

type EntryCellProps = {
  color: string;
  dimensionKey: string;
  glyph: string;
  highlight: EntryHighlightState;
  onDimensionClick: (dimensionKey: string) => void;
  searchHaystack?: string;
  title?: string;
  ariaLabel?: string;
  className?: string;
  bubbleClassName?: string;
  children?: ReactNode;
};

export function EntryCell({
  color,
  dimensionKey,
  highlight,
  onDimensionClick,
  searchHaystack = "",
  glyph,
  title,
  ariaLabel,
  className = "",
  bubbleClassName = "text-base",
  children,
}: EntryCellProps) {
  const state = resolveEntryVisualState(dimensionKey, searchHaystack, highlight);
  const bubbleStyle: CSSProperties = entryStyle(color, state);

  return (
    <button
      type="button"
      title={title}
      aria-label={ariaLabel}
      aria-pressed={state === "focused"}
      className={[
        "cursor-pointer select-none border-0 bg-transparent p-0",
        className,
      ].join(" ")}
      onClick={() => onDimensionClick(dimensionKey)}
    >
      <span
        className={["leading-none", bubbleClassName].join(" ")}
        style={bubbleStyle}
        aria-hidden={children ? true : undefined}
      >
        {glyph}
      </span>
      {children}
    </button>
  );
}
