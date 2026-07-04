import { isMissingEntry, type BrowserEntry } from "./types";

export function layoutEpisodeEntries(
  entries: BrowserEntry[],
  groupEnabled: boolean,
  groupSortKey: (entry: BrowserEntry) => string | number,
): BrowserEntry[] {
  if (!groupEnabled) {
    return [...entries].sort((a, b) => a.rank - b.rank);
  }

  return [...entries].sort((a, b) => {
    const keyA = groupSortKey(a);
    const keyB = groupSortKey(b);
    if (keyA !== keyB) {
      if (typeof keyA === "number" && typeof keyB === "number") {
        return keyB - keyA;
      }
      return String(keyA).localeCompare(String(keyB));
    }
    return a.rank - b.rank;
  });
}
