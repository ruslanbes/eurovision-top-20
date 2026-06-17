import type { PeriodManifest, VideoStatsSnapshot } from "./types";

const manifestUrl = `${import.meta.env.BASE_URL}data/periods-alltime.json`;

function snapshotUrl(period: string): string {
  return `${import.meta.env.BASE_URL}data/packaged/per-video/alltime/eurovision-top-20-alltime-${period}.json`;
}

export async function loadPeriodManifest(): Promise<PeriodManifest> {
  const response = await fetch(manifestUrl);
  if (!response.ok) {
    throw new Error(`Failed to load period manifest (${response.status})`);
  }
  return response.json() as Promise<PeriodManifest>;
}

export async function loadVideoSnapshot(
  period: string,
): Promise<VideoStatsSnapshot> {
  const response = await fetch(snapshotUrl(period));
  if (!response.ok) {
    throw new Error(`Failed to load snapshot for ${period} (${response.status})`);
  }
  return response.json() as Promise<VideoStatsSnapshot>;
}
