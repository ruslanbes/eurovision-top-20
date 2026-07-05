import { textMatchesQuery } from "../stats/filters/normalizeSearchText";
import { MISSING_DIMENSION } from "./constants";
import type { EntryVisualState } from "./entryFocus";
import { entryVisualState } from "./entryFocus";

export type EntryHighlightSource = "none" | "search" | "click";

export type EntryHighlightState = {
  focusedDimension: string | null;
  searchQuery: string;
  source: EntryHighlightSource;
};

export const NEUTRAL_HIGHLIGHT: EntryHighlightState = {
  source: "none",
  searchQuery: "",
  focusedDimension: null,
};

export function resolveEntryVisualState(
  dimensionKey: string,
  haystack: string,
  highlight: EntryHighlightState,
): EntryVisualState {
  if (highlight.source === "click") {
    return entryVisualState(dimensionKey, highlight.focusedDimension);
  }

  if (highlight.source === "search") {
    const query = highlight.searchQuery.trim();
    if (!query) {
      return "neutral";
    }
    if (dimensionKey === MISSING_DIMENSION) {
      return "dimmed";
    }
    return textMatchesQuery(haystack, query) ? "focused" : "dimmed";
  }

  return "neutral";
}
