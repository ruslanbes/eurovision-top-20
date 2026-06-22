import type { EpisodeYearComposition, YearColors } from "./episodeComposition";

const insightsBase = `${import.meta.env.BASE_URL}data/packaged/insights`;

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url} (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export async function loadYearCompositionData(): Promise<{
  composition: EpisodeYearComposition;
  colors: YearColors;
}> {
  const [composition, colors] = await Promise.all([
    fetchJson<EpisodeYearComposition>(
      `${insightsBase}/episode-year-composition.json`,
    ),
    fetchJson<YearColors>(`${insightsBase}/year-colors.json`),
  ]);
  return { composition, colors };
}
