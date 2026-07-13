import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { VideoHitsPayload } from "../stats/queryWindow";
import type { SongStatsRow, VideoStatsRow } from "../stats/types";
import { songLinkFromSong } from "./formatters";
import {
  chartYearsBySongKey,
  computeYearClassics,
  yearClassics,
  type YearClassicsParams,
} from "./insights/yearClassics";

const DEFAULT_PARAMS: YearClassicsParams = {
  minDistinctYears: 8,
  maxItems: 10,
};

describe("chartYearsBySongKey", () => {
  it("merges calendar years across videos for the same song", () => {
    const videoLatest = [
      {
        video_title: "Artist - Song | Official",
        artist: "Artist",
        song: "Song",
        country: "Nowhere",
        flag: "🏳️",
        year: 2009,
        chart_points: 10,
        youtube_watch_url: "https://example.com/a",
        top1: 0,
        top3: 0,
        top5: 0,
        top10: 0,
        top20: 2,
      },
      {
        video_title: "Artist - Song (LIVE)",
        artist: "Artist",
        song: "Song",
        country: "Nowhere",
        flag: "🏳️",
        year: 2009,
        chart_points: 5,
        youtube_watch_url: "https://example.com/b",
        top1: 0,
        top3: 0,
        top5: 0,
        top10: 0,
        top20: 1,
      },
    ] as VideoStatsRow[];

    const hits: VideoHitsPayload = {
      periods: ["2016-01", "2017-01", "2018-01"],
      hits: [
        {
          video_title: "Artist - Song | Official",
          youtube_video_id: "a",
          entries: [{ period: "2016-01", rank: 1 }, { period: "2017-01", rank: 2 }],
        },
        {
          video_title: "Artist - Song (LIVE)",
          youtube_video_id: "b",
          entries: [{ period: "2018-01", rank: 3 }],
        },
      ],
    };

    const years = chartYearsBySongKey(hits, videoLatest);
    expect([...years.values()][0]).toEqual(new Set(["2016", "2017", "2018"]));
  });
});

describe("computeYearClassics", () => {
  it("keeps songs with enough distinct chart years", () => {
    const songLatest = [
      { artist: "A", song: "Hit", year: 2009, top20: 50, chart_points: 100, country: "X", flag: "🏳️", fire: false, youtube_video_id: "a", youtube_watch_url: null },
      { artist: "B", song: "Miss", year: 2010, top20: 10, chart_points: 20, country: "Y", flag: "🏳️", fire: false, youtube_video_id: "b", youtube_watch_url: null },
    ] as SongStatsRow[];

    const videoLatest = [
      { video_title: "A - Hit", artist: "A", song: "Hit", year: 2009, top20: 50, chart_points: 100, country: "X", flag: "🏳️", youtube_watch_url: null, top1: 0, top3: 0, top5: 0, top10: 0 },
      { video_title: "B - Miss", artist: "B", song: "Miss", year: 2010, top20: 10, chart_points: 20, country: "Y", flag: "🏳️", youtube_watch_url: null, top1: 0, top3: 0, top5: 0, top10: 0 },
    ] as VideoStatsRow[];

    const hits: VideoHitsPayload = {
      periods: ["2016-01", "2017-01", "2018-01", "2019-01", "2020-01", "2021-01", "2022-01", "2023-01"],
      hits: [
        {
          video_title: "A - Hit",
          youtube_video_id: "a",
          entries: [
            { period: "2016-01", rank: 1 },
            { period: "2017-01", rank: 1 },
            { period: "2018-01", rank: 1 },
            { period: "2019-01", rank: 1 },
            { period: "2020-01", rank: 1 },
            { period: "2021-01", rank: 1 },
            { period: "2022-01", rank: 1 },
            { period: "2023-01", rank: 1 },
          ],
        },
        {
          video_title: "B - Miss",
          youtube_video_id: "b",
          entries: [{ period: "2016-01", rank: 2 }, { period: "2017-01", rank: 2 }],
        },
      ],
    };

    const classics = computeYearClassics(hits, videoLatest, songLatest, DEFAULT_PARAMS);

    expect(classics).toHaveLength(1);
    expect(classics[0]?.distinct_years).toBe(8);
    expect(classics[0]?.contest_year).toBe(2009);
  });

  it("respects maxItems after sorting by distinct years", () => {
    const songLatest = [
      { artist: "A", song: "One", year: 2009, top20: 50, chart_points: 100, country: "X", flag: "🏳️", fire: false, youtube_video_id: "a", youtube_watch_url: null },
      { artist: "B", song: "Two", year: 2010, top20: 40, chart_points: 90, country: "Y", flag: "🏳️", fire: false, youtube_video_id: "b", youtube_watch_url: null },
    ] as SongStatsRow[];

    const videoLatest = [
      { video_title: "A - One", artist: "A", song: "One", year: 2009, top20: 50, chart_points: 100, country: "X", flag: "🏳️", youtube_watch_url: null, top1: 0, top3: 0, top5: 0, top10: 0 },
      { video_title: "B - Two", artist: "B", song: "Two", year: 2010, top20: 40, chart_points: 90, country: "Y", flag: "🏳️", youtube_watch_url: null, top1: 0, top3: 0, top5: 0, top10: 0 },
    ] as VideoStatsRow[];

    const eight = ["2016", "2017", "2018", "2019", "2020", "2021", "2022", "2023"].map(
      (year) => ({ period: `${year}-01`, rank: 1 }),
    );

    const hits: VideoHitsPayload = {
      periods: eight.map((entry) => entry.period),
      hits: [
        { video_title: "A - One", youtube_video_id: "a", entries: [...eight, { period: "2024-01", rank: 1 }] },
        { video_title: "B - Two", youtube_video_id: "b", entries: eight },
      ],
    };

    const classics = computeYearClassics(
      hits,
      videoLatest,
      songLatest,
      { ...DEFAULT_PARAMS, maxItems: 1 },
    );

    expect(classics).toHaveLength(1);
    expect(classics[0]?.distinct_years).toBe(9);
    expect(classics[0]?.label).toBe("A — One");
  });
});

describe("yearClassics integration", () => {
  it("finds classics on packaged data", () => {
    const repoRoot = join(process.cwd(), "..");
    const videoRows = JSON.parse(
      readFileSync(
        join(repoRoot, "data/packaged/per-video/alltime/eurovision-top-20-alltime-latest.json"),
        "utf-8",
      ),
    ).rows as VideoStatsRow[];
    const songRows = JSON.parse(
      readFileSync(
        join(repoRoot, "data/packaged/per-song/alltime/eurovision-top-20-song-stats-latest.json"),
        "utf-8",
      ),
    ).rows as SongStatsRow[];
    const videoHits = JSON.parse(
      readFileSync(join(repoRoot, "data/packaged/query/video-hits.json"), "utf-8"),
    ) as VideoHitsPayload;

    const classics = computeYearClassics(
      videoHits,
      videoRows,
      songRows,
      DEFAULT_PARAMS,
    );

    expect(classics).toHaveLength(8);
    expect(classics[0]?.label).toMatch(/Düm Tek Tek|Dum Tek Tek/i);
    expect(classics[0]?.distinct_years).toBe(11);

    const fairytale = classics.find((item) => item.label.includes("Fairytale"));
    expect(fairytale?.distinct_years).toBe(8);
    expect(fairytale?.label).toMatch(/ — Fairytale$/);

    const result = yearClassics.compute(
      {
        episodesBrowser: null,
        latestPeriod: videoHits.periods[videoHits.periods.length - 1] ?? "",
        periods: videoHits.periods,
        songLatest: songRows,
        songHits: null,
        videoHits,
        videoLatest: videoRows,
      },
      DEFAULT_PARAMS,
    );

    expect(result?.viewKind).toBe("table");
    if (result?.viewKind === "table" && result.tableKind === "count_label") {
      expect(result.rows).toHaveLength(8);
      expect(result.countColumnLabel).toBe("Chart years");
      expect(result.labelColumn).toBe("Song");
      expect(result.rows[0]?.count).toBe(11);
      expect(result.rows[0]?.label).toMatch(/Düm Tek Tek|Dum Tek Tek/i);
      expect(
        songLinkFromSong(
          songRows.find((row) => row.song.includes("Fairytale"))!,
          videoRows,
        ).href,
      ).toMatch(/youtube\.com/);
      expect(result.rows.find((row) => row.label.includes("Fairytale"))?.count).toBe(8);
    }
  });
});
