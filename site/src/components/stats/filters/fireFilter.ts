export const FIRE_FILTER_ON = "1";

export function fireFilterActive(selected: readonly (string | number)[]): boolean {
  return selected.includes(FIRE_FILTER_ON);
}
