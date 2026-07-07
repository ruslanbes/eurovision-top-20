export type EscFinalPlace = number | string | null;

const SPECIAL_CODE_ORDER = [
  "DNQ",
  "DQ",
  "CANCELLED",
  "WITHDRAWN",
  "PENDING",
  "NON_ENTRY",
] as const;

const SPECIAL_CODE_SORT_BASE = 1000;

const DISPLAY_LABELS: Record<string, string> = {
  CANCELLED: "Cancelled",
  WITHDRAWN: "Withdrawn",
  DNQ: "DNQ",
  DQ: "DQ",
  NON_ENTRY: "Non-entry",
  PENDING: "Pending",
};

export function formatEscFinalPlace(value: EscFinalPlace): string {
  if (value === null || value === undefined) {
    return "—";
  }
  if (typeof value === "number") {
    return String(value);
  }
  return DISPLAY_LABELS[value] ?? value;
}

export function escFinalPlaceSortKey(value: EscFinalPlace): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const index = SPECIAL_CODE_ORDER.indexOf(
      value as (typeof SPECIAL_CODE_ORDER)[number],
    );
    if (index >= 0) {
      return SPECIAL_CODE_SORT_BASE + index;
    }
    return SPECIAL_CODE_SORT_BASE + SPECIAL_CODE_ORDER.length;
  }
  return 10_000;
}

export const ESC_FINAL_PLACE_COLUMN_TITLE =
  "ESC Grand Final placement";
