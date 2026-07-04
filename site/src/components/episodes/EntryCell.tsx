import type { CSSProperties, ReactNode } from "react";

import { entryStyle, entryVisualState } from "./entryFocus";

type EntryCellProps = {
  color: string;
  dimensionKey: string;
  focusedDimension: string | null;
  onDimensionClick: (dimensionKey: string) => void;
  glyph: string;
  title?: string;
  ariaLabel?: string;
  className?: string;
  bubbleClassName?: string;
  children?: ReactNode;
};

export function EntryCell({
  color,
  dimensionKey,
  focusedDimension,
  onDimensionClick,
  glyph,
  title,
  ariaLabel,
  className = "",
  bubbleClassName = "text-base",
  children,
}: EntryCellProps) {
  const state = entryVisualState(dimensionKey, focusedDimension);
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
