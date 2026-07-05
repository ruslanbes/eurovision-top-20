import { songMetaLookupKey } from "../../stats/songMetaLookupKey";
import type { SongStatsRow, VideoStatsRow } from "../../stats/types";
import type { VideoHitsPayload } from "../../stats/queryWindow";
import { songLinkFromSong } from "../formatters";
import type {
  InsightContext,
  InsightDefinition,
  InsightLabelEpisodesRow,
  InsightResult,
} from "../types";
import {
  episodeLinksForPeriods,
  episodeWatchUrlsByPeriod,
} from "./episodeChartUtils";

export type MultiVersionEpisodeParams = {
  minVersions: number;
};

type SongIdentity = {
  artist: string;
  song: string;
};

function videoTitleSongLookup(
  videoLatest: VideoStatsRow[],
): Map<string, SongIdentity> {
  const lookup = new Map<string, SongIdentity>();

  for (const row of videoLatest) {
    if (!row.artist?.trim() || !row.song?.trim()) {
      continue;
    }
    lookup.set(row.video_title, { artist: row.artist, song: row.song });
  }

  return lookup;
}

export function computeMultiVersionEpisodeRows(
  videoHits: VideoHitsPayload,
  videoLatest: VideoStatsRow[],
  episodeWatchUrls: Map<string, string | null>,
  params: MultiVersionEpisodeParams,
): InsightLabelEpisodesRow[] {
  const titleToSong = videoTitleSongLookup(videoLatest);
  const songPeriodTitles = new Map<string, Map<string, Set<string>>>();

  for (const hit of videoHits.hits) {
    const identity = titleToSong.get(hit.video_title);
    if (!identity) {
      continue;
    }

    const songKey = songMetaLookupKey(identity.artist, identity.song);

    for (const entry of hit.entries) {
      let byPeriod = songPeriodTitles.get(songKey);
      if (!byPeriod) {
        byPeriod = new Map();
        songPeriodTitles.set(songKey, byPeriod);
      }

      let titles = byPeriod.get(entry.period);
      if (!titles) {
        titles = new Set();
        byPeriod.set(entry.period, titles);
      }
      titles.add(hit.video_title);
    }
  }

  const rows: InsightLabelEpisodesRow[] = [];

  for (const [songKey, byPeriod] of songPeriodTitles) {
    const qualifyingPeriods: string[] = [];
    for (const [period, titles] of byPeriod) {
      if (titles.size >= params.minVersions) {
        qualifyingPeriods.push(period);
      }
    }

    if (qualifyingPeriods.length === 0) {
      continue;
    }

    const identity = [...titleToSong.values()].find(
      (candidate) => songMetaLookupKey(candidate.artist, candidate.song) === songKey,
    );
    if (!identity) {
      continue;
    }

    const link = songLinkFromSong(
      {
        artist: identity.artist,
        song: identity.song,
      } as SongStatsRow,
      videoLatest,
    );

    rows.push({
      id: songKey,
      label: link.label,
      labelHref: link.href,
      episodes: episodeLinksForPeriods(qualifyingPeriods.sort(), episodeWatchUrls),
    });
  }

  return rows.sort((left, right) => left.label.localeCompare(right.label));
}

export const multiVersionEpisode: InsightDefinition<MultiVersionEpisodeParams> = {
  id: "multi-version-episode",
  section: "other",
  title: "Hat-trick",
  grain: "song",
  defaultParams: {
    minVersions: 3,
  },
  needs: ["videoLatest", "videoHits", "episodesBrowser", "periodsManifest"],
  compute(ctx, params) {
    if (!ctx.videoHits || !ctx.episodesBrowser) {
      return null;
    }

    const episodeWatchUrls = episodeWatchUrlsByPeriod(ctx.episodesBrowser);
    const rows = computeMultiVersionEpisodeRows(
      ctx.videoHits,
      ctx.videoLatest,
      episodeWatchUrls,
      params,
    );

    if (rows.length === 0) {
      return null;
    }

    const result: InsightResult = {
      viewKind: "table",
      tableKind: "label_episodes",
      labelColumn: "Song",
      title: "Hat-trick",
      lead: "Songs with three or more distinct videos in the same monthly Top 20:",
      rows,
      footnote: `Distinct videos = different YouTube clips of the same song.`,
    };

    return result;
  },
};
