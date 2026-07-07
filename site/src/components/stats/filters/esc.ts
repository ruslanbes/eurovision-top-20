import type { FilterValue } from "./types";

export const ESC_WINNERS = "winners";
export const ESC_NOT_WINNERS = "not-winners";
export const ESC_NON_ENTRIES = "non-entries";
export const ESC_DNQ = "dnq";

export const ESC_NON_ENTRY_PLACE = "NON_ENTRY";
export const ESC_DNQ_PLACE = "DNQ";

export type EscMode =
  | typeof ESC_WINNERS
  | typeof ESC_NOT_WINNERS
  | typeof ESC_NON_ENTRIES
  | typeof ESC_DNQ;

export function isEscWinner(place: number | string | null | undefined): boolean {
  return place === 1;
}

export function isEscNonEntry(place: number | string | null | undefined): boolean {
  return place === ESC_NON_ENTRY_PLACE;
}

export function isEscDnq(place: number | string | null | undefined): boolean {
  return place === ESC_DNQ_PLACE;
}

export function escMatch(
  place: number | string | null | undefined,
  selected: readonly FilterValue[],
): boolean {
  const mode = selected[0];
  if (mode === ESC_WINNERS) {
    return isEscWinner(place);
  }
  if (mode === ESC_NOT_WINNERS) {
    return !isEscWinner(place);
  }
  if (mode === ESC_NON_ENTRIES) {
    return isEscNonEntry(place);
  }
  if (mode === ESC_DNQ) {
    return isEscDnq(place);
  }
  return true;
}
