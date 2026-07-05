import {
  pickCanonicalSongMember,
  videoRowsForSongKey,
} from "../stats/canonicalSongMember";
import type { SongStatsRow, VideoStatsRow } from "../stats/types";

export function uploadLinkLabel(upload: VideoStatsRow): string {
  return upload.video_title;
}

export function uploadLinkFromVideo(row: VideoStatsRow): {
  href: string | null;
  label: string;
} {
  return {
    label: uploadLinkLabel(row),
    href: row.youtube_watch_url,
  };
}

export function uploadLinkFromSong(
  songRow: SongStatsRow,
  videoLatest: VideoStatsRow[],
): {
  href: string | null;
  label: string;
} {
  const members = videoRowsForSongKey(songRow.artist, songRow.song, videoLatest);
  if (members.length === 0) {
    return {
      label: `${songRow.artist} — ${songRow.song}`,
      href: null,
    };
  }

  const upload = pickCanonicalSongMember(members);
  return {
    label: uploadLinkLabel(upload),
    href: upload.youtube_watch_url,
  };
}

export function formatChartPoints(value: number): string {
  return `${value} chart points`;
}
