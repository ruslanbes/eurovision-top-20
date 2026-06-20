import type {
  SongHitsPayload,
  SongMetaPayload,
  VideoHitsPayload,
  VideoMetaPayload,
} from "./queryWindow";
import type { StatsGrain } from "./types";

const queryBase = `${import.meta.env.BASE_URL}data/packaged/query`;

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url} (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export type VideoQueryData = {
  hits: VideoHitsPayload;
  meta: VideoMetaPayload;
};

export type SongQueryData = {
  hits: SongHitsPayload;
  meta: SongMetaPayload;
};

export type QueryData = VideoQueryData | SongQueryData;

export async function loadQueryData(grain: StatsGrain): Promise<QueryData> {
  if (grain === "video") {
    const [hits, meta] = await Promise.all([
      fetchJson<VideoHitsPayload>(`${queryBase}/video-hits.json`),
      fetchJson<VideoMetaPayload>(`${queryBase}/video-meta.json`),
    ]);
    return { hits, meta };
  }

  const [hits, meta] = await Promise.all([
    fetchJson<SongHitsPayload>(`${queryBase}/song-hits.json`),
    fetchJson<SongMetaPayload>(`${queryBase}/song-meta.json`),
  ]);
  return { hits, meta };
}
