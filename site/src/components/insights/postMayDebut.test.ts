import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { EpisodesBrowserPayload } from "../episodes/types";
import type { VideoHitsPayload } from "../stats/queryWindow";
import type { VideoStatsRow } from "../stats/types";
import {
  isPostMayChartPeriod,
  isPreMayChartPeriod,
  qualifiesPostMayDebut,
} from "./insights/episodeChartUtils";
import { computePostMayDebutRows, postMayDebut } from "./insights/postMayDebut";

describe("qualifiesPostMayDebut", () => {
  const corpus = ["2017-02", "2017-05", "2017-06", "2017-07"];

  it("accepts first chart after May with no pre-May or May presence", () => {
    expect(
      qualifiesPostMayDebut(new Set(["2017-06"]), 2017, corpus),
    ).toBe(true);
  });

  it("rejects pre-May chart", () => {
    expect(
      qualifiesPostMayDebut(new Set(["2017-02", "2017-06"]), 2017, corpus),
    ).toBe(false);
  });

  it("rejects May chart", () => {
    expect(
      qualifiesPostMayDebut(new Set(["2017-05", "2017-06"]), 2017, corpus),
    ).toBe(false);
  });

  it("rejects when May episode missing for contest year", () => {
    expect(
      qualifiesPostMayDebut(new Set(["2016-06"]), 2016, corpus),
    ).toBe(false);
  });

  it("rejects when only pre-May periods exist", () => {
    expect(qualifiesPostMayDebut(new Set(["2017-02"]), 2017, corpus)).toBe(false);
  });
});

describe("period helpers", () => {
  it("classifies contest-year windows", () => {
    expect(isPreMayChartPeriod("2026-04", 2026)).toBe(true);
    expect(isPreMayChartPeriod("2026-05", 2026)).toBe(false);
    expect(isPostMayChartPeriod("2026-06", 2026)).toBe(true);
    expect(isPostMayChartPeriod("2027-04", 2026)).toBe(true);
    expect(isPostMayChartPeriod("2027-05", 2026)).toBe(false);
  });
});

describe("computePostMayDebutRows", () => {
  const corpus = [
    "2026-02",
    "2026-03",
    "2026-04",
    "2026-05",
    "2026-06",
  ];
  const episodeUrls = new Map([
    ["2026-05", "https://www.youtube.com/watch?v=may"],
    ["2026-06", "https://www.youtube.com/watch?v=june"],
  ]);

  const videoLatest = [
    {
      video_title: "Denmark NF | Official Video",
      artist: "Denmark",
      song: "Track",
      country: "Denmark",
      flag: "🇩🇰",
      year: 2026,
      chart_points: 5,
      youtube_watch_url: "https://www.youtube.com/watch?v=nf",
      top1: 0,
      top3: 0,
      top5: 0,
      top10: 0,
      top20: 1,
    },
    {
      video_title: "Denmark GF LIVE | Grand Final",
      artist: "Denmark",
      song: "Track",
      country: "Denmark",
      flag: "🇩🇰",
      year: 2026,
      chart_points: 8,
      youtube_watch_url: "https://www.youtube.com/watch?v=gf",
      top1: 0,
      top3: 0,
      top5: 0,
      top10: 0,
      top20: 1,
    },
  ] as VideoStatsRow[];

  const hits: VideoHitsPayload = {
    periods: corpus,
    hits: [
      {
        video_title: "Denmark NF | Official Video",
        youtube_video_id: "nf",
        entries: [{ period: "2026-02", rank: 10 }],
      },
      {
        video_title: "Denmark GF LIVE | Grand Final",
        youtube_video_id: "gf",
        entries: [{ period: "2026-06", rank: 15 }],
      },
    ],
  };

  it("excludes song when any video charted pre-May", () => {
    const rows = computePostMayDebutRows(hits, videoLatest, corpus, episodeUrls);

    expect(rows).toHaveLength(0);
  });

  it("shows only the first post-May episode when a song charted in multiple months", () => {
    const rows = computePostMayDebutRows(
      {
        periods: ["2017-05", "2017-06", "2017-07"],
        hits: [
          {
            video_title: "Artist - Song | Live",
            youtube_video_id: "live",
            entries: [
              { period: "2017-06", rank: 10 },
              { period: "2017-07", rank: 8 },
            ],
          },
        ],
      },
      [
        {
          video_title: "Artist - Song | Live",
          artist: "Artist",
          song: "Song",
          country: "Nowhere",
          flag: "🏳️",
          year: 2017,
          chart_points: 10,
          youtube_watch_url: "https://www.youtube.com/watch?v=live",
          top1: 0,
          top3: 0,
          top5: 0,
          top10: 0,
          top20: 2,
        },
      ] as VideoStatsRow[],
      ["2017-05", "2017-06", "2017-07"],
      new Map([
        ["2017-06", "https://www.youtube.com/watch?v=jun17"],
        ["2017-07", "https://www.youtube.com/watch?v=jul17"],
      ]),
    );

    expect(rows[0]?.episodes).toEqual([
      {
        period: "2017-06",
        label: "Jun 2017",
        href: "https://www.youtube.com/watch?v=jun17",
      },
    ]);
  });

  it("excludes World country entries", () => {
    const rows = computePostMayDebutRows(
      {
        periods: ["2019-05", "2019-06"],
        hits: [
          {
            video_title: "Switch Song | Special",
            youtube_video_id: "switch",
            entries: [{ period: "2019-06", rank: 5 }],
          },
        ],
      },
      [
        {
          video_title: "Switch Song | Special",
          artist: "Various",
          song: "Switch Song",
          country: "World",
          flag: "🌍",
          year: 2019,
          chart_points: 10,
          youtube_watch_url: "https://www.youtube.com/watch?v=switch",
          top1: 0,
          top3: 0,
          top5: 0,
          top10: 0,
          top20: 1,
        },
      ] as VideoStatsRow[],
      ["2019-05", "2019-06"],
      new Map([["2019-06", "https://www.youtube.com/watch?v=ep"]]),
    );

    expect(rows).toHaveLength(0);
  });
});

describe("postMayDebut integration", () => {
  it("matches expected ESC song count on packaged data", () => {
    const repoRoot = join(process.cwd(), "..");
    const videoRows = JSON.parse(
      readFileSync(
        join(repoRoot, "data/packaged/per-video/alltime/eurovision-top-20-alltime-latest.json"),
        "utf-8",
      ),
    ).rows as VideoStatsRow[];
    const videoHits = JSON.parse(
      readFileSync(join(repoRoot, "data/packaged/query/video-hits.json"), "utf-8"),
    ) as VideoHitsPayload;
    const browser = JSON.parse(
      readFileSync(join(repoRoot, "data/packaged/episodes/browser.json"), "utf-8"),
    ) as EpisodesBrowserPayload;

    const ctx = {
      episodesBrowser: browser,
      latestPeriod: videoHits.periods[videoHits.periods.length - 1] ?? "",
      periods: videoHits.periods,
      songLatest: [],
      videoHits,
      videoLatest: videoRows,
    };

    const episodeUrls = new Map(
      browser.episodes.map((episode) => [
        episode.period,
        episode.youtube_video_id
          ? `https://www.youtube.com/watch?v=${episode.youtube_video_id}`
          : null,
      ]),
    );

    const rows = computePostMayDebutRows(
      videoHits,
      videoRows,
      videoHits.periods,
      episodeUrls,
    );

    expect(rows.length).toBe(5);
    expect(rows.every((row) => row.episodes.length === 1)).toBe(true);
    expect(rows.map((row) => row.contestYear)).toEqual(
      [...rows.map((row) => row.contestYear!)].sort((left, right) => left - right),
    );
    expect(rows.some((row) => row.label.includes("Switch Song"))).toBe(false);

    const result = postMayDebut.compute(ctx, {});

    expect(result?.viewKind).toBe("table");
    if (result?.viewKind === "table" && result.tableKind === "label_episodes") {
      expect(result.rows).toHaveLength(5);
      expect(result.labelColumn).toBe("Song");
      expect(result.episodeColumnLabel).toBe("Debut");
      expect(result.footnote).toBe(`After May = Jun–Apr next calendar year.`);
    }
  });
});
