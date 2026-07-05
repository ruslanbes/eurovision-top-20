import { songMetaLookupKey } from "../../stats/songMetaLookupKey";
import type { VideoStatsRow } from "../../stats/types";
import type { VideoHitsPayload } from "../../stats/queryWindow";
import { songLinkFromSong } from "../formatters";
import type {
  InsightContext,
  InsightDefinition,
  InsightLabelEpisodesRow,
  InsightResult,
} from "../types";
import {
  corpusMayYears,
  episodeLinksForPeriods,
  episodeWatchUrlsByPeriod,
  firstPostMayChartPeriod,
  qualifiesPostMayDebut,
} from "./episodeChartUtils";

function parseSongChartId(id: string): { contestYear: number; songKey: string } {
  const parts = id.split("\0");
  const contestYear = Number.parseInt(parts[parts.length - 1] ?? "", 10);
  return {
    contestYear,
    songKey: parts.slice(0, -1).join("\0"),
  };
}

function isEscContestEntry(row: VideoStatsRow): boolean {
  return row.country != null && row.country !== "World";
}

function videoRowByTitle(videoLatest: VideoStatsRow[]): Map<string, VideoStatsRow> {
  return new Map(videoLatest.map((row) => [row.video_title, row]));
}

function chartPeriodsBySongKey(
  hits: VideoHitsPayload,
  videoLatest: VideoStatsRow[],
): Map<string, Set<string>> {
  const byTitle = videoRowByTitle(videoLatest);
  const bySong = new Map<string, Set<string>>();

  for (const hit of hits.hits) {
    const row = byTitle.get(hit.video_title);
    if (
      !row?.artist?.trim() ||
      !row.song?.trim() ||
      row.year == null ||
      !isEscContestEntry(row)
    ) {
      continue;
    }

    const id = `${songMetaLookupKey(row.artist, row.song)}\0${row.year}`;
    let periods = bySong.get(id);
    if (!periods) {
      periods = new Set();
      bySong.set(id, periods);
    }
    for (const entry of hit.entries) {
      periods.add(entry.period);
    }
  }

  return bySong;
}

export function computePostMayDebutRows(
  hits: VideoHitsPayload,
  videoLatest: VideoStatsRow[],
  corpusPeriods: readonly string[],
  episodeWatchUrls: Map<string, string | null>,
): InsightLabelEpisodesRow[] {
  const rows: InsightLabelEpisodesRow[] = [];
  const mayYears = corpusMayYears(corpusPeriods);
  const bySong = chartPeriodsBySongKey(hits, videoLatest);

  for (const [id, chartPeriods] of bySong) {
    const { contestYear, songKey } = parseSongChartId(id);
    if (!Number.isFinite(contestYear) || !mayYears.includes(contestYear)) {
      continue;
    }
    if (!qualifiesPostMayDebut(chartPeriods, contestYear, corpusPeriods)) {
      continue;
    }

    const row = videoLatest.find(
      (candidate) =>
        candidate.year === contestYear &&
        isEscContestEntry(candidate) &&
        songMetaLookupKey(candidate.artist!, candidate.song!) === songKey,
    );
    if (!row?.artist || !row.song) {
      continue;
    }

    const debutPeriod = firstPostMayChartPeriod(chartPeriods, contestYear);
    if (!debutPeriod) {
      continue;
    }

    const link = songLinkFromSong(row, videoLatest);
    rows.push({
      id,
      contestYear,
      label: link.label,
      labelHref: link.href,
      episodes: episodeLinksForPeriods([debutPeriod], episodeWatchUrls),
    });
  }

  return rows.sort((left, right) => {
    if (left.contestYear !== right.contestYear) {
      return left.contestYear - right.contestYear;
    }
    const leftFirst = left.episodes[0]?.label ?? "";
    const rightFirst = right.episodes[0]?.label ?? "";
    if (leftFirst !== rightFirst) {
      return leftFirst.localeCompare(rightFirst);
    }
    return left.label.localeCompare(right.label);
  });
}

export const postMayDebut: InsightDefinition<Record<string, never>> = {
  id: "post-may-debut",
  section: "other",
  title: "After May debut",
  grain: "song",
  defaultParams: {},
  needs: ["videoLatest", "videoHits", "episodesBrowser", "periodsManifest"],
  compute(ctx) {
    if (!ctx.videoHits || !ctx.episodesBrowser) {
      return null;
    }

    const rows = computePostMayDebutRows(
      ctx.videoHits,
      ctx.videoLatest,
      ctx.periods,
      episodeWatchUrlsByPeriod(ctx.episodesBrowser),
    );

    if (rows.length === 0) {
      return null;
    }

    const result: InsightResult = {
      viewKind: "table",
      tableKind: "label_episodes",
      episodeColumnLabel: "Debut",
      labelColumn: "Song",
      showYearColumn: true,
      title: "After May debut",
      lead: "ESC songs that only started charting after May:",
      rows,
      footnote: `After May = Jun–Apr next calendar year.`,
    };

    return result;
  },
};
