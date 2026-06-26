import { useCallback, useState } from "react";

import { toggleDimensionFocus } from "./compositionSlotFocus";

export function useDimensionFocus() {
  const [focusedDimension, setFocusedDimension] = useState<string | null>(null);

  const handleDimensionClick = useCallback((dimensionKey: string) => {
    setFocusedDimension((current) => toggleDimensionFocus(current, dimensionKey));
  }, []);

  return {
    focusedDimension,
    handleDimensionClick,
  };
}
