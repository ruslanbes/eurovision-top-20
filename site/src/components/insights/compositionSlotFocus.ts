import type { CSSProperties } from "react";

import { MISSING_COUNTRY } from "./episodeComposition";

export const DIMMED_SLOT_OPACITY = 0.7;

export type CompositionSlotVisualState = "neutral" | "focused" | "dimmed";

export function toggleDimensionFocus(
  focusedDimension: string | null,
  clickedDimension: string,
): string | null {
  if (clickedDimension === MISSING_COUNTRY) {
    return null;
  }
  if (focusedDimension === clickedDimension) {
    return null;
  }
  return clickedDimension;
}

export function compositionSlotVisualState(
  dimensionKey: string,
  focusedDimension: string | null,
): CompositionSlotVisualState {
  if (!focusedDimension) {
    return "neutral";
  }
  if (dimensionKey === MISSING_COUNTRY) {
    return "dimmed";
  }
  if (dimensionKey === focusedDimension) {
    return "focused";
  }
  return "dimmed";
}

/** Same-color halo emphasis (preferred over border / shadow). */
export function compositionSlotEmphasisStyle(color: string): CSSProperties {
  return {
    textShadow: `0 0 1px ${color}, 0 0 2px ${color}`,
  };
}

export function compositionSlotStyle(
  color: string,
  state: CompositionSlotVisualState,
): CSSProperties {
  const style: CSSProperties = { color };
  if (state === "dimmed") {
    style.opacity = DIMMED_SLOT_OPACITY;
  }
  if (state === "focused") {
    Object.assign(style, compositionSlotEmphasisStyle(color));
  }
  return style;
}
