/** NFD does not decompose these; fold for ASCII-friendly search. */
const SEARCH_LETTER_FOLDS: Readonly<Record<string, string>> = {
  æ: "ae",
  ð: "d",
  ø: "o",
  œ: "oe",
  ß: "ss",
  þ: "th",
  ł: "l",
};

export function normalizeSearchText(value: string): string {
  const stripped = value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("en");

  let folded = "";
  for (const character of stripped) {
    folded += SEARCH_LETTER_FOLDS[character] ?? character;
  }
  return folded;
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
