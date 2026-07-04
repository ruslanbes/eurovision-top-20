import type { CSSProperties } from "react";

import { MISSING_DIMENSION } from "./constants";

export const DIMMED_ENTRY_OPACITY = 0.7;

export type EntryVisualState = "neutral" | "focused" | "dimmed";

export function toggleEntryFocus(
  focusedDimension: string | null,
  clickedDimension: string,
): string | null {
  if (clickedDimension === MISSING_DIMENSION) {
    return null;
  }
  if (focusedDimension === clickedDimension) {
    return null;
  }
  return clickedDimension;
}

export function entryVisualState(
  dimensionKey: string,
  focusedDimension: string | null,
): EntryVisualState {
  if (!focusedDimension) {
    return "neutral";
  }
  if (dimensionKey === MISSING_DIMENSION) {
    return "dimmed";
  }
  if (dimensionKey === focusedDimension) {
    return "focused";
  }
  return "dimmed";
}

/** Same-color halo emphasis (preferred over border / shadow). */
export function entryEmphasisStyle(color: string): CSSProperties {
  return {
    textShadow: `0 0 1px ${color}, 0 0 2px ${color}`,
  };
}

export function entryStyle(
  color: string,
  state: EntryVisualState,
): CSSProperties {
  const style: CSSProperties = { color };
  if (state === "dimmed") {
    style.opacity = DIMMED_ENTRY_OPACITY;
  }
  if (state === "focused") {
    Object.assign(style, entryEmphasisStyle(color));
  }
  return style;
}
