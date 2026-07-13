import { songMetaLookupKey } from "../stats/songMetaLookupKey";
import {
  querySongWindow,
  type SongHitsPayload,
  type SongMetaPayload,
  type WindowSongRow,
} from "../stats/queryWindow";
import {
  normalizeWindow,
  statsUiStateSearch,
} from "../stats/statsUiState";
import type { SongStatsRow } from "../stats/types";
import { buildUpWindowBounds } from "./insights/episodeChartUtils";

export function songMetaFromSongLatest(rows: SongStatsRow[]): SongMetaPayload {
  return {
    rows: rows.map((row) => ({
      artist: row.artist,
      country: row.country,
      esc_final_place: row.esc_final_place,
      fire: row.fire,
      flag: row.flag,
      song: row.song,
      year: row.year,
      youtube_video_id: row.youtube_video_id,
      youtube_watch_url: row.youtube_watch_url,
    })),
  };
}

function isContestEntry(row: WindowSongRow): boolean {
  if (row.country === "World") {
    return false;
  }
  const esc = row.esc_final_place;
  return esc !== "NON_ENTRY" && esc !== null && esc !== "PENDING";
}

export function buildUpSongsPageHref(
  contestYear: number,
  periods: readonly string[],
): string {
  const { begin, end } = buildUpWindowBounds(contestYear);
  const window = normalizeWindow(begin, end, periods);
  const query = statsUiStateSearch(
    {
      window,
      filters: { year: [contestYear] },
      sort: null,
    },
    periods,
  );
  return `${import.meta.env.BASE_URL}songs/${query}`;
}

export function buildUpRankLinkTitle(contestYear: number): string {
  return `Open Songs table: May ${contestYear - 1} – Apr ${contestYear}, contest year ${contestYear}`;
}

export type BuildUpWinnerRank = {
  poolSize: number;
  rank: number | null;
};

export function winnerRankInBuildUpPool(
  songHits: SongHitsPayload,
  songMeta: SongMetaPayload,
  periods: readonly string[],
  contestYear: number,
  winnerArtist: string,
  winnerSong: string,
): BuildUpWinnerRank {
  const { begin, end } = buildUpWindowBounds(contestYear);
  const window = normalizeWindow(begin, end, periods);
  const windowSongs = querySongWindow(songHits, songMeta, window.begin, window.end);
  const pool = windowSongs.filter(
    (row) => row.year === contestYear && row.chart_points > 0 && isContestEntry(row),
  );
  const winnerKey = songMetaLookupKey(winnerArtist, winnerSong);
  const rankIndex = pool.findIndex(
    (row) => songMetaLookupKey(row.artist, row.song) === winnerKey,
  );

  return {
    poolSize: pool.length,
    rank: rankIndex >= 0 ? rankIndex + 1 : null,
  };
}
