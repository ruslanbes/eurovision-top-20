import type { EpisodesBrowserPayload, YearColors } from "./types";

const episodesBase = `${import.meta.env.BASE_URL}data/packaged/episodes`;

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url} (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export async function loadEpisodesBrowserData(): Promise<{
  browser: EpisodesBrowserPayload;
  yearColors: YearColors;
}> {
  const [browser, yearColors] = await Promise.all([
    fetchJson<EpisodesBrowserPayload>(`${episodesBase}/browser.json`),
    fetchJson<YearColors>(`${episodesBase}/year-colors.json`),
  ]);
  return { browser, yearColors };
}
