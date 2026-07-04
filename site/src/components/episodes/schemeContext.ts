import type { BrowserEpisode, YearColors } from "./types";
import { isFilledEntry, isMissingEntry } from "./types";
import { UNKNOWN_COUNTRY_DIMENSION } from "./constants";
import type { EpisodeSchemeContext } from "./schemes/types";
import { isKnownCountryEntry } from "./schemes/countryScheme";
import {
  ESC_OTHER_DIMENSION,
  ESC_WINNER_DIMENSION,
} from "./schemes/escWinnerScheme";
import {
  FIRE_DIMENSION,
  FIRE_OTHER_DIMENSION,
} from "./schemes/fireScheme";

/** CSS var references — resolve at paint time so theme toggles update without re-render. */
export function chartMissingColor(): string {
  return "rgb(var(--chart-missing))";
}

export function chartOtherColor(): string {
  return "rgb(var(--chart-other))";
}

export function chartEscWinnerColor(): string {
  return "rgb(var(--chart-esc-winner))";
}

export function chartEscOtherColor(): string {
  return chartOtherColor();
}

export function chartFireOtherColor(): string {
  return chartOtherColor();
}

export function chartCountryHaloColor(): string {
  return chartOtherColor();
}

export function chartCountryUnknownColor(): string {
  return chartOtherColor();
}

export function buildYearSchemeContext(
  yearColors: YearColors,
  missingColor: string,
): EpisodeSchemeContext {
  const colorMap: Record<string, string> = {};
  for (const [year, entry] of Object.entries(yearColors.colors)) {
    colorMap[year] = entry.hex;
  }
  return { colorMap, missingColor };
}

export function buildEscWinnerSchemeContext(
  missingColor: string,
): EpisodeSchemeContext {
  return {
    colorMap: {
      [ESC_WINNER_DIMENSION]: chartEscWinnerColor(),
      [ESC_OTHER_DIMENSION]: chartEscOtherColor(),
    },
    missingColor,
  };
}

export function buildFireSchemeContext(
  missingColor: string,
): EpisodeSchemeContext {
  const otherColor = chartFireOtherColor();
  return {
    colorMap: {
      [FIRE_DIMENSION]: otherColor,
      [FIRE_OTHER_DIMENSION]: otherColor,
    },
    missingColor,
  };
}

export function buildCountrySchemeContext(
  episodes: BrowserEpisode[],
  missingColor: string,
): EpisodeSchemeContext {
  const glyphMap: Record<string, string> = {};
  const colorMap: Record<string, string> = {};
  const haloColor = chartCountryHaloColor();
  const unknownColor = chartCountryUnknownColor();

  for (const episode of episodes) {
    for (const entry of episode.entries) {
      if (isMissingEntry(entry)) {
        continue;
      }
      if (isFilledEntry(entry) && isKnownCountryEntry(entry)) {
        if (!(entry.country in glyphMap)) {
          glyphMap[entry.country] = entry.flag;
          colorMap[entry.country] = haloColor;
        }
      }
    }
  }

  colorMap[UNKNOWN_COUNTRY_DIMENSION] = unknownColor;

  return { colorMap, missingColor, glyphMap };
}

export function buildSchemeContext(
  schemeId: string,
  payload: { yearColors: YearColors; browser: { episodes: BrowserEpisode[] } },
  missingColor: string,
): EpisodeSchemeContext {
  if (schemeId === "year") {
    return buildYearSchemeContext(payload.yearColors, missingColor);
  }
  if (schemeId === "esc-winner") {
    return buildEscWinnerSchemeContext(missingColor);
  }
  if (schemeId === "country") {
    return buildCountrySchemeContext(payload.browser.episodes, missingColor);
  }
  if (schemeId === "fire") {
    return buildFireSchemeContext(missingColor);
  }
  return { colorMap: {}, missingColor };
}
