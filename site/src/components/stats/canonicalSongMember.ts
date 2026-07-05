import { songMetaLookupKey } from "./songMetaLookupKey";
import type { VideoStatsRow } from "./types";

const SONG_ROLLUP_STRING_FIELDS = ["artist", "song", "flag", "country"] as const;

/** Match pipeline `is_eligible_song_rollup_row`. */
export function isEligibleSongRollupRow(row: VideoStatsRow): boolean {
  for (const field of SONG_ROLLUP_STRING_FIELDS) {
    const value = row[field];
    if (value == null || !String(value).trim()) {
      return false;
    }
  }
  return row.year != null;
}

/** Match pipeline `_member_precedence_key` — highest chart_points member wins. */
export function memberPrecedenceKey(row: VideoStatsRow): (number | string)[] {
  return [
    row.chart_points,
    row.top1,
    row.top3,
    row.top5,
    row.top10,
    row.top20,
    row.video_title.toLocaleLowerCase("en"),
  ];
}

export function compareMemberPrecedence(left: VideoStatsRow, right: VideoStatsRow): number {
  const leftKey = memberPrecedenceKey(left);
  const rightKey = memberPrecedenceKey(right);
  for (let index = 0; index < leftKey.length; index += 1) {
    const leftPart = leftKey[index];
    const rightPart = rightKey[index];
    if (leftPart === rightPart) {
      continue;
    }
    if (typeof leftPart === "number" && typeof rightPart === "number") {
      return leftPart < rightPart ? -1 : 1;
    }
    return String(leftPart).localeCompare(String(rightPart));
  }
  return 0;
}

/** Match pipeline `_canonical_member` — used for song table links and insights. */
export function pickCanonicalSongMember(members: VideoStatsRow[]): VideoStatsRow {
  return members.reduce((best, row) =>
    compareMemberPrecedence(row, best) > 0 ? row : best,
  );
}

export function videoRowsForSongKey(
  artist: string,
  song: string,
  videoRows: VideoStatsRow[],
): VideoStatsRow[] {
  const key = songMetaLookupKey(artist, song);
  return videoRows.filter(
    (row) =>
      isEligibleSongRollupRow(row) &&
      songMetaLookupKey(row.artist!, row.song!) === key,
  );
}

export function canonicalSongWatchUrl(
  artist: string,
  song: string,
  videoRows: VideoStatsRow[],
): string | null {
  const members = videoRowsForSongKey(artist, song, videoRows);
  if (members.length === 0) {
    return null;
  }
  return pickCanonicalSongMember(members).youtube_watch_url;
}
