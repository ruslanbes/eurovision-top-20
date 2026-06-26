import type { CSSProperties, ReactNode } from "react";

import {
  compositionSlotStyle,
  compositionSlotVisualState,
} from "./compositionSlotFocus";

const SLOT_CIRCLE = "\u25cf";

type CompositionSlotProps = {
  color: string;
  dimensionKey: string;
  focusedDimension: string | null;
  onDimensionClick: (dimensionKey: string) => void;
  title?: string;
  ariaLabel?: string;
  className?: string;
  bubbleClassName?: string;
  children?: ReactNode;
};

export function CompositionSlot({
  color,
  dimensionKey,
  focusedDimension,
  onDimensionClick,
  title,
  ariaLabel,
  className = "",
  bubbleClassName = "text-base",
  children,
}: CompositionSlotProps) {
  const state = compositionSlotVisualState(dimensionKey, focusedDimension);
  const bubbleStyle: CSSProperties = compositionSlotStyle(color, state);

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
        {SLOT_CIRCLE}
      </span>
      {children}
    </button>
  );
}

export { SLOT_CIRCLE };
