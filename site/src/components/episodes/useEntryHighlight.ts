import { useCallback, useState } from "react";

import { toggleEntryFocus } from "./entryFocus";
import type { EntryHighlightSource, EntryHighlightState } from "./entryHighlight";
import { NEUTRAL_HIGHLIGHT } from "./entryHighlight";

export function useEntryHighlight() {
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightSource, setHighlightSource] = useState<EntryHighlightSource>("none");
  const [focusedDimension, setFocusedDimension] = useState<string | null>(null);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setHighlightSource(query.trim() ? "search" : "none");
    setFocusedDimension(null);
  }, []);

  const handleDimensionClick = useCallback((dimensionKey: string) => {
    setFocusedDimension((current) => toggleEntryFocus(current, dimensionKey));
    setHighlightSource("click");
  }, []);

  const clearHighlight = useCallback(() => {
    setSearchQuery("");
    setHighlightSource("none");
    setFocusedDimension(null);
  }, []);

  const highlight: EntryHighlightState =
    highlightSource === "none"
      ? NEUTRAL_HIGHLIGHT
      : {
          source: highlightSource,
          searchQuery,
          focusedDimension,
        };

  return {
    clearHighlight,
    handleDimensionClick,
    handleSearchChange,
    highlight,
    searchQuery,
  };
}
