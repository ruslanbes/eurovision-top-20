import type {
  PeriodManifest,
  SongStatsSnapshot,
  StatsVariant,
  VideoStatsSnapshot,
} from "./types";

function manifestUrl(variant: StatsVariant): string {
  return `${import.meta.env.BASE_URL}data/periods-${variant}.json`;
}

function videoSnapshotUrl(variant: StatsVariant, period: string): string {
  const basename =
    variant === "alltime"
      ? `eurovision-top-20-alltime-${period}.json`
      : `eurovision-top-20-recent-${period}.json`;
  return `${import.meta.env.BASE_URL}data/packaged/per-video/${variant}/${basename}`;
}

function songSnapshotUrl(variant: StatsVariant, period: string): string {
  return `${import.meta.env.BASE_URL}data/packaged/per-song/${variant}/eurovision-top-20-song-stats-${period}.json`;
}

export async function loadPeriodManifest(
  variant: StatsVariant,
): Promise<PeriodManifest> {
  const response = await fetch(manifestUrl(variant));
  if (!response.ok) {
    throw new Error(`Failed to load ${variant} period manifest (${response.status})`);
  }
  return response.json() as Promise<PeriodManifest>;
}

export async function loadVideoSnapshot(
  variant: StatsVariant,
  period: string,
): Promise<VideoStatsSnapshot> {
  const response = await fetch(videoSnapshotUrl(variant, period));
  if (!response.ok) {
    throw new Error(
      `Failed to load ${variant} video snapshot for ${period} (${response.status})`,
    );
  }
  return response.json() as Promise<VideoStatsSnapshot>;
}

export async function loadSongSnapshot(
  variant: StatsVariant,
  period: string,
): Promise<SongStatsSnapshot> {
  const response = await fetch(songSnapshotUrl(variant, period));
  if (!response.ok) {
    throw new Error(
      `Failed to load ${variant} song snapshot for ${period} (${response.status})`,
    );
  }
  return response.json() as Promise<SongStatsSnapshot>;
}
