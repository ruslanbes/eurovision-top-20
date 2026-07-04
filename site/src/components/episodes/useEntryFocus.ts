import { useCallback, useState } from "react";

import { toggleEntryFocus } from "./entryFocus";

export function useEntryFocus() {
  const [focusedDimension, setFocusedDimension] = useState<string | null>(null);

  const handleDimensionClick = useCallback((dimensionKey: string) => {
    setFocusedDimension((current) => toggleEntryFocus(current, dimensionKey));
  }, []);

  const clearFocus = useCallback(() => {
    setFocusedDimension(null);
  }, []);

  return {
    focusedDimension,
    handleDimensionClick,
    clearFocus,
  };
}
