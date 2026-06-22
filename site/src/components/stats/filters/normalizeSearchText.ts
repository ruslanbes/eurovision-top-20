export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("en");
}

export function textMatchesQuery(haystack: string, query: string): boolean {
  const needle = query.trim();
  if (!needle) {
    return true;
  }
  return normalizeSearchText(haystack).includes(normalizeSearchText(needle));
}

export function searchFilterActive(selected: readonly (string | number)[]): boolean {
  const query = selected[0];
  return typeof query === "string" && query.trim().length > 0;
}
