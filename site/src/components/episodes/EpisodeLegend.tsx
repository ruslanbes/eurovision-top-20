import { ENTRY_CIRCLE, MISSING_DIMENSION, MISSING_ENTRY_LABEL } from "./constants";
import { EntryCell } from "./EntryCell";

type EpisodeLegendProps = {
  items: string[];
  colorMap: Record<string, string>;
  missingColor: string;
  legendItemGlyph: (item: string) => string;
  legendItemAriaLabel: (item: string) => string;
  focusedDimension?: string | null;
  onDimensionClick?: (dimensionKey: string) => void;
};

export function EpisodeLegend({
  items,
  colorMap,
  missingColor,
  legendItemGlyph,
  legendItemAriaLabel,
  focusedDimension = null,
  onDimensionClick,
}: EpisodeLegendProps) {
  if (items.length === 0) {
    return null;
  }

  const interactive = onDimensionClick != null;

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-text select-none">
      {items.map((item) =>
        interactive ? (
          <EntryCell
            key={item}
            color={colorMap[item] ?? "transparent"}
            dimensionKey={item}
            focusedDimension={focusedDimension ?? null}
            onDimensionClick={onDimensionClick}
            glyph={legendItemGlyph(item)}
            className="inline-flex items-center gap-2"
            bubbleClassName="text-sm"
            ariaLabel={legendItemAriaLabel(item)}
          >
            {item}
          </EntryCell>
        ) : (
          <span key={item} className="inline-flex items-center gap-2">
            <span
              className="text-sm leading-none"
              style={{ color: colorMap[item] ?? "transparent" }}
              aria-hidden="true"
            >
              {legendItemGlyph(item)}
            </span>
            {item}
          </span>
        ),
      )}
      {interactive ? (
        <EntryCell
          color={missingColor}
          dimensionKey={MISSING_DIMENSION}
          focusedDimension={focusedDimension ?? null}
          onDimensionClick={onDimensionClick}
          glyph={ENTRY_CIRCLE}
          className="inline-flex items-center gap-2 text-text-muted"
          bubbleClassName="text-sm"
          ariaLabel={MISSING_ENTRY_LABEL}
        >
          {MISSING_ENTRY_LABEL}
        </EntryCell>
      ) : (
        <span className="inline-flex items-center gap-2 text-text-muted">
          <span className="text-sm leading-none text-chart-missing" aria-hidden="true">
            {ENTRY_CIRCLE}
          </span>
          {MISSING_ENTRY_LABEL}
        </span>
      )}
    </div>
  );
}
