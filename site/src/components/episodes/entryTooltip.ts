import { MISSING_ENTRY_LABEL } from "./constants";
import { isMissingEntry, type BrowserEntry } from "./types";

export function entryTooltipLabel(entry: BrowserEntry): string {
  if (isMissingEntry(entry)) {
    return MISSING_ENTRY_LABEL;
  }
  return entry.video_title;
}
