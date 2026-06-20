import type { FilterValue } from "./types";

export const ESC_WINNER_WINNERS = "winners";
export const ESC_WINNER_NOT_WINNERS = "not-winners";

export type EscWinnerMode =
  | typeof ESC_WINNER_WINNERS
  | typeof ESC_WINNER_NOT_WINNERS;

export function isEscWinner(place: number | string | null | undefined): boolean {
  return place === 1;
}

export function escWinnerMatch(
  place: number | string | null | undefined,
  selected: readonly FilterValue[],
): boolean {
  const mode = selected[0];
  if (mode === ESC_WINNER_WINNERS) {
    return isEscWinner(place);
  }
  if (mode === ESC_WINNER_NOT_WINNERS) {
    return !isEscWinner(place);
  }
  return true;
}
