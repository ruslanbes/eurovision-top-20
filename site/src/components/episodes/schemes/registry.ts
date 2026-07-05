import type { EpisodeScheme } from "./types";
import { countryScheme } from "./countryScheme";
import { escWinnerScheme } from "./escWinnerScheme";
import { fireScheme } from "./fireScheme";
import { songsScheme } from "./songsScheme";
import { videosScheme } from "./videosScheme";
import { yearScheme } from "./yearScheme";

/** Stable picker order — append new schemes here when registering. */
const SCHEME_ORDER: EpisodeScheme[] = [
  countryScheme,
  yearScheme,
  videosScheme,
  songsScheme,
  escWinnerScheme,
  fireScheme,
];

const schemesById = Object.fromEntries(
  SCHEME_ORDER.map((scheme) => [scheme.id, scheme]),
) as Record<string, EpisodeScheme>;

export function listEpisodeSchemes(): EpisodeScheme[] {
  return SCHEME_ORDER;
}

export function getEpisodeScheme(id: string): EpisodeScheme | undefined {
  return schemesById[id];
}

export function defaultEpisodeScheme(): EpisodeScheme {
  return countryScheme;
}
