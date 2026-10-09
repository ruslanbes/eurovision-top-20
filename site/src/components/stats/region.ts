export const REGION_EUROPE = "europe";
export const REGION_ASIA = "asia";

export type Region = typeof REGION_EUROPE | typeof REGION_ASIA;

export const REGION_ORDER: readonly Region[] = [REGION_EUROPE, REGION_ASIA];

const REGION_LABELS: Record<Region, string> = {
  [REGION_ASIA]: "Asia",
  [REGION_EUROPE]: "Europe",
};

export function isRegion(value: unknown): value is Region {
  return value === REGION_EUROPE || value === REGION_ASIA;
}

export function formatRegion(value: Region | null | undefined): string {
  return value ? REGION_LABELS[value] : "—";
}
