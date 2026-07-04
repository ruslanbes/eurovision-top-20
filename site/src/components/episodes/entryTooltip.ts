import { formatPeriodLabel } from "../stats/sort";
import { MISSING_ENTRY_LABEL } from "./constants";
import { isMissingEntry, type BrowserEntry } from "./types";

export function entryTooltipLabel(period: string, entry: BrowserEntry): string {
  const header = `${formatPeriodLabel(period)}:`;
  if (isMissingEntry(entry)) {
    return `${header}\n${MISSING_ENTRY_LABEL}`;
  }
  return `${header}\n${entry.video_title}`;
}
