export type VideoHitEntry = {
  period: string;
  rank: number;
};

export type VideoHit = {
  entries: VideoHitEntry[];
  video_title: string;
  youtube_video_id: string;
};

export type VideoHitsPayload = {
  hits: VideoHit[];
  periods: string[];
};

export type VideoMetaRow = {
  artist: string | null;
  country: string | null;
  esc_final_place: number | string | null;
  fire: boolean;
  flag: string | null;
  metadata_extractor: string | null;
  performance_category: string | null;
  song: string | null;
  video_title: string;
  year: number | null;
  youtube_video_id: string;
  youtube_watch_url: string | null;
};

export type VideoMetaPayload = {
  rows: VideoMetaRow[];
};

export type SongHitEntry = {
  period: string;
  ranks: number[];
};

export type SongHit = {
  artist: string;
  entries: SongHitEntry[];
  song: string;
};

export type SongHitsPayload = {
  hits: SongHit[];
  periods: string[];
};

export type SongMetaRow = {
  artist: string;
  country: string;
  esc_final_place: number | string | null;
  fire: boolean;
  flag: string;
  song: string;
  year: number;
  youtube_video_id: string;
  youtube_watch_url: string | null;
};

export type SongMetaPayload = {
  rows: SongMetaRow[];
};

export type WindowVideoRow = {
  artist: string | null;
  chart_points: number;
  country: string | null;
  esc_final_place: number | string | null;
  fire: boolean;
  flag: string | null;
  metadata_extractor: string | null;
  performance_category: string | null;
  song: string | null;
  top1: number;
  top3: number;
  top5: number;
  top10: number;
  top20: number;
  video_title: string;
  year: number | null;
  youtube_video_id: string;
  youtube_watch_url: string | null;
};

export type WindowSongRow = {
  artist: string;
  chart_points: number;
  country: string;
  esc_final_place: number | string | null;
  fire: boolean;
  flag: string;
  song: string;
  top1: number;
  top3: number;
  top5: number;
  top10: number;
  top20: number;
  year: number;
  youtube_video_id: string;
  youtube_watch_url: string | null;
};

const TIER_FIELDS = ["top1", "top3", "top5", "top10", "top20"] as const;
const CHART_POINT_WEIGHTS: Record<(typeof TIER_FIELDS)[number], number> = {
  top20: 1,
  top10: 2,
  top5: 3,
  top3: 4,
  top1: 5,
};

function emptyTiers(): Record<(typeof TIER_FIELDS)[number], number> {
  return { top1: 0, top3: 0, top5: 0, top10: 0, top20: 0 };
}

function tiersFromRank(rank: number): Record<(typeof TIER_FIELDS)[number], number> {
  const tiers = emptyTiers();
  if (rank <= 1) tiers.top1 += 1;
  if (rank <= 3) tiers.top3 += 1;
  if (rank <= 5) tiers.top5 += 1;
  if (rank <= 10) tiers.top10 += 1;
  if (rank <= 20) tiers.top20 += 1;
  return tiers;
}

function addTiers(
  left: Record<(typeof TIER_FIELDS)[number], number>,
  right: Record<(typeof TIER_FIELDS)[number], number>,
): Record<(typeof TIER_FIELDS)[number], number> {
  return {
    top1: left.top1 + right.top1,
    top3: left.top3 + right.top3,
    top5: left.top5 + right.top5,
    top10: left.top10 + right.top10,
    top20: left.top20 + right.top20,
  };
}

export function chartPointsFromTiers(
  tiers: Record<(typeof TIER_FIELDS)[number], number>,
): number {
  return TIER_FIELDS.reduce(
    (total, field) => total + tiers[field] * CHART_POINT_WEIGHTS[field],
    0,
  );
}

function periodInRange(
  period: string,
  begin: string,
  end: string,
  periods: string[],
): boolean {
  const beginIndex = periods.indexOf(begin);
  const endIndex = periods.indexOf(end);
  const index = periods.indexOf(period);
  return beginIndex <= index && index <= endIndex;
}

function videoSortKey(row: WindowVideoRow): [number, number, number, number, number, number, string] {
  return [
    -row.chart_points,
    -row.top1,
    -row.top3,
    -row.top5,
    -row.top10,
    -row.top20,
    row.video_title.toLowerCase(),
  ];
}

function songSortKey(row: WindowSongRow): [number, number, number, number, number, number, string, string] {
  return [
    -row.chart_points,
    -row.top1,
    -row.top3,
    -row.top5,
    -row.top10,
    -row.top20,
    row.artist.toLowerCase(),
    row.song.toLowerCase(),
  ];
}

export function queryVideoWindow(
  videoHits: VideoHitsPayload,
  videoMeta: VideoMetaPayload,
  begin: string,
  end: string,
): WindowVideoRow[] {
  const metaByTitle = new Map(
    videoMeta.rows.map((row) => [row.video_title, row]),
  );
  const rows: WindowVideoRow[] = [];

  for (const hit of videoHits.hits) {
    let tiers = emptyTiers();
    for (const entry of hit.entries) {
      if (!periodInRange(entry.period, begin, end, videoHits.periods)) {
        continue;
      }
      tiers = addTiers(tiers, tiersFromRank(entry.rank));
    }
    if (!TIER_FIELDS.some((field) => tiers[field] > 0)) {
      continue;
    }

    const meta = metaByTitle.get(hit.video_title);
    rows.push({
      video_title: hit.video_title,
      youtube_video_id: hit.youtube_video_id,
      youtube_watch_url: meta?.youtube_watch_url ?? null,
      artist: meta?.artist ?? null,
      song: meta?.song ?? null,
      flag: meta?.flag ?? null,
      country: meta?.country ?? null,
      performance_category: meta?.performance_category ?? null,
      year: meta?.year ?? null,
      esc_final_place: meta?.esc_final_place ?? null,
      fire: meta?.fire ?? false,
      metadata_extractor: meta?.metadata_extractor ?? null,
      ...tiers,
      chart_points: chartPointsFromTiers(tiers),
    });
  }

  rows.sort((left, right) => {
    const leftKey = videoSortKey(left);
    const rightKey = videoSortKey(right);
    for (let index = 0; index < leftKey.length; index += 1) {
      if (leftKey[index] !== rightKey[index]) {
        return leftKey[index] < rightKey[index] ? -1 : 1;
      }
    }
    return 0;
  });
  return rows;
}

export function querySongWindow(
  songHits: SongHitsPayload,
  songMeta: SongMetaPayload,
  begin: string,
  end: string,
): WindowSongRow[] {
  const metaByKey = new Map(
    songMeta.rows.map((row) => [`${row.artist.toLowerCase()}\0${row.song.toLowerCase()}`, row]),
  );
  const rows: WindowSongRow[] = [];

  for (const hit of songHits.hits) {
    let tiers = emptyTiers();
    for (const entry of hit.entries) {
      if (!periodInRange(entry.period, begin, end, songHits.periods)) {
        continue;
      }
      for (const rank of entry.ranks) {
        if (rank >= 1 && rank <= 20) {
          tiers = addTiers(tiers, tiersFromRank(rank));
        }
      }
    }
    if (!TIER_FIELDS.some((field) => tiers[field] > 0)) {
      continue;
    }

    const meta = metaByKey.get(`${hit.artist.toLowerCase()}\0${hit.song.toLowerCase()}`);
    rows.push({
      artist: hit.artist,
      song: hit.song,
      flag: meta?.flag ?? "",
      country: meta?.country ?? "",
      year: meta?.year ?? 0,
      esc_final_place: meta?.esc_final_place ?? null,
      fire: meta?.fire ?? false,
      youtube_video_id: meta?.youtube_video_id ?? "",
      youtube_watch_url: meta?.youtube_watch_url ?? null,
      ...tiers,
      chart_points: chartPointsFromTiers(tiers),
    });
  }

  rows.sort((left, right) => {
    const leftKey = songSortKey(left);
    const rightKey = songSortKey(right);
    for (let index = 0; index < leftKey.length; index += 1) {
      if (leftKey[index] !== rightKey[index]) {
        return leftKey[index] < rightKey[index] ? -1 : 1;
      }
    }
    return 0;
  });
  return rows;
}
