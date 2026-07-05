import {
  episodeMonthYearLabel,
  youtubeWatchUrl,
} from "../../episodes/periodLabels";
import { songMetaLookupKey } from "../../stats/songMetaLookupKey";
import type { SongStatsRow, VideoStatsRow } from "../../stats/types";
import type { VideoHitsPayload } from "../../stats/queryWindow";
import type { EpisodesBrowserPayload } from "../../episodes/types";
import { songLinkFromSong } from "../formatters";
import type {
  InsightContext,
  InsightDefinition,
  InsightEpisodeLink,
  InsightResult,
  InsightSongEpisodesRow,
} from "../types";

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

function episodeWatchUrlsByPeriod(
  browser: EpisodesBrowserPayload,
): Map<string, string | null> {
  const urls = new Map<string, string | null>();
  for (const episode of browser.episodes) {
    urls.set(episode.period, youtubeWatchUrl(episode.youtube_video_id));
  }
  return urls;
}

export function computeMultiVersionEpisodeRows(
  videoHits: VideoHitsPayload,
  videoLatest: VideoStatsRow[],
  episodeWatchUrls: Map<string, string | null>,
  params: MultiVersionEpisodeParams,
): InsightSongEpisodesRow[] {
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

  const rows: InsightSongEpisodesRow[] = [];

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

    qualifyingPeriods.sort();
    const episodes: InsightEpisodeLink[] = qualifyingPeriods.map((period) => ({
      label: episodeMonthYearLabel(period),
      href: episodeWatchUrls.get(period) ?? null,
    }));

    rows.push({
      id: songKey,
      songLabel: link.label,
      songHref: link.href,
      episodes,
    });
  }

  return rows.sort((left, right) => left.songLabel.localeCompare(right.songLabel));
}

export const multiVersionEpisode: InsightDefinition<MultiVersionEpisodeParams> = {
  id: "multi-version-episode",
  section: "other",
  title: "Three versions, one episode",
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
      tableKind: "song_episodes",
      title: "Three versions, one episode",
      lead: "Songs with three or more distinct uploads in the same monthly Top 20:",
      rows,
      footnote: `Distinct uploads = different YouTube titles for the same song key. Episode links open the channel’s Top 20 roundup video (snapshot ${ctx.latestPeriod}).`,
    };

    return result;
  },
};
