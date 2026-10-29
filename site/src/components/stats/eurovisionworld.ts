import { REGION_ASIA, type Region } from "./region";

export const EUROVISIONWORLD_ORIGIN = "https://eurovisionworld.com";

export const VIRTUAL_WORLD_COUNTRY = "World";

/** Rare overrides when kebab-case of the canonical name is wrong on Eurovisionworld. */
const COUNTRY_SLUG_OVERRIDES: Record<string, string> = {};

function contestPathPrefix(region: Region): string {
  return region === REGION_ASIA ? "eurovision-asia" : "eurovision";
}

/**
 * Canonical country display name → Eurovisionworld path slug.
 * Returns null for World / empty / non-slugable values.
 */
export function countryToSlug(country: string | null | undefined): string | null {
  if (!country || country === VIRTUAL_WORLD_COUNTRY) {
    return null;
  }
  const override = COUNTRY_SLUG_OVERRIDES[country];
  if (override) {
    return override;
  }
  const slug = country
    .trim()
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : null;
}

export function eurovisionworldYearHref(
  year: number,
  region: Region = "europe",
): string {
  return `${EUROVISIONWORLD_ORIGIN}/${contestPathPrefix(region)}/${year}`;
}

export function eurovisionworldCountryHref(
  country: string | null | undefined,
  region: Region = "europe",
): string | null {
  const slug = countryToSlug(country);
  if (!slug) {
    return null;
  }
  return `${EUROVISIONWORLD_ORIGIN}/${contestPathPrefix(region)}/${slug}`;
}
