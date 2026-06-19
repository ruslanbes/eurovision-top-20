import type { PeriodManifest, SongStatsSnapshot, VideoStatsSnapshot } from "./types";

const manifestUrl = `${import.meta.env.BASE_URL}data/periods-alltime.json`;

function videoSnapshotUrl(period: string): string {
  return `${import.meta.env.BASE_URL}data/packaged/per-video/alltime/eurovision-top-20-alltime-${period}.json`;
}

function songSnapshotUrl(period: string): string {
  return `${import.meta.env.BASE_URL}data/packaged/per-song/alltime/eurovision-top-20-song-stats-${period}.json`;
}

export async function loadPeriodManifest(): Promise<PeriodManifest> {
  const response = await fetch(manifestUrl);
  if (!response.ok) {
    throw new Error(`Failed to load period manifest (${response.status})`);
  }
  return response.json() as Promise<PeriodManifest>;
}

export async function loadVideoSnapshot(period: string): Promise<VideoStatsSnapshot> {
  const response = await fetch(videoSnapshotUrl(period));
  if (!response.ok) {
    throw new Error(`Failed to load video snapshot for ${period} (${response.status})`);
  }
  return response.json() as Promise<VideoStatsSnapshot>;
}

export async function loadSongSnapshot(period: string): Promise<SongStatsSnapshot> {
  const response = await fetch(songSnapshotUrl(period));
  if (!response.ok) {
    throw new Error(`Failed to load song snapshot for ${period} (${response.status})`);
  }
  return response.json() as Promise<SongStatsSnapshot>;
}
