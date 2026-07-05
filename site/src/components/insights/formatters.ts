import {
  pickCanonicalSongMember,
  videoRowsForSongKey,
} from "../stats/canonicalSongMember";
import type { SongStatsRow, VideoStatsRow } from "../stats/types";

export function videoLinkLabel(video: VideoStatsRow): string {
  return video.video_title;
}

export function videoLinkFromVideo(row: VideoStatsRow): {
  href: string | null;
  label: string;
} {
  return {
    label: videoLinkLabel(row),
    href: row.youtube_watch_url,
  };
}

export function videoLinkFromSong(
  songRow: SongStatsRow,
  videoLatest: VideoStatsRow[],
): {
  href: string | null;
  label: string;
} {
  return songLinkFromSong(songRow, videoLatest);
}

/** `Artist — Song` linked to the canonical member video with the most chart points. */
export function songLinkFromSong(
  songRow: SongStatsRow,
  videoLatest: VideoStatsRow[],
): {
  href: string | null;
  label: string;
} {
  const label = `${songRow.artist} — ${songRow.song}`;
  const members = videoRowsForSongKey(songRow.artist, songRow.song, videoLatest);
  if (members.length === 0) {
    return {
      label,
      href: null,
    };
  }

  const video = pickCanonicalSongMember(members);
  return {
    label,
    href: video.youtube_watch_url,
  };
}

export function formatChartPoints(value: number): string {
  return `${value} chart points`;
}
