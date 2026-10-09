import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildEpisodeRankIndex } from "./escWinnerData";
import {
  computeBuildUpRankRows,
  computeUncrownedRows,
  escBuildUpRank,
  escUncrowned,
} from "./insights/escWinnerInsights";
import type { VideoHitsPayload } from "../stats/queryWindow";
import type { SongStatsRow, VideoStatsRow } from "../stats/types";
import type { InsightContext } from "./types";

function fixtureContext(): InsightContext {
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
  const songHits = JSON.parse(
    readFileSync(join(repoRoot, "data/packaged/query/song-hits.json"), "utf-8"),
  );

  return {
    episodesBrowser: null,
    latestPeriod: videoHits.periods[videoHits.periods.length - 1] ?? "",
    periods: videoHits.periods,
    videoLatest: videoRows,
    songLatest: songRows,
    songHits,
    videoHits,
  };
}

describe("buildEpisodeRankIndex", () => {
  it("maps period and title to rank", () => {
    const index = buildEpisodeRankIndex({
      periods: ["2024-05"],
      hits: [
        {
          video_title: "Winner LIVE",
          youtube_video_id: "abc",
          entries: [{ period: "2024-05", rank: 1 }],
        },
      ],
    });

    expect(index.get("2024-05")?.get("Winner LIVE")).toBe(1);
  });
});

describe("computeUncrownedRows", () => {
  it("lists 2017+ winners who never hit #1 on packaged data", () => {
    const ctx = fixtureContext();
    const rows = computeUncrownedRows(ctx);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      year: "2025",
      rank: 2,
      linkLabel: expect.stringMatching(/JJ/),
    });
    expect(rows[0]?.linkHref).toMatch(/youtube\.com/);
    expect(rows.some((row) => row.year === "2024")).toBe(false);
  });

  it("returns empty when every winner has topped the chart", () => {
    const rows = computeUncrownedRows({
      episodesBrowser: null,
      latestPeriod: "2024-05",
      periods: ["2024-05"],
      videoLatest: [
        {
          video_title: "Winner LIVE",
          chart_points: 10,
          youtube_video_id: "abc",
          youtube_watch_url: "https://www.youtube.com/watch?v=abc",
          artist: "A",
          song: "B",
          top1: 1,
          top3: 1,
          top5: 1,
          top10: 1,
          top20: 1,
          esc_final_place: 1,
          fire: false,
          region: "europe",
          flag: "🇸🇪",
          country: "Sweden",
          performance_category: "final_live",
          year: 2024,
          metadata_extractor: null,
        },
      ],
      songLatest: [],
      songHits: null,
      videoHits: {
        periods: ["2024-05"],
        hits: [
          {
            video_title: "Winner LIVE",
            youtube_video_id: "abc",
            entries: [{ period: "2024-05", rank: 1 }],
          },
        ],
      },
    });

    expect(rows).toEqual([]);
  });
});

describe("computeUncrownedRows per region", () => {
  function winner(region: "europe" | "asia", title: string): VideoStatsRow {
    return {
      video_title: title,
      chart_points: 10,
      youtube_video_id: title,
      youtube_watch_url: `https://www.youtube.com/watch?v=${title}`,
      artist: title,
      song: "Song",
      top1: 0,
      top3: 1,
      top5: 1,
      top10: 1,
      top20: 1,
      esc_final_place: 1,
      fire: false,
      region,
      flag: "🏳️",
      country: "Country",
      performance_category: "final_live",
      year: 2027,
      metadata_extractor: null,
    };
  }

  it("lists Europe and Asia winners of the same year as separate rows", () => {
    const rows = computeUncrownedRows({
      episodesBrowser: null,
      latestPeriod: "2027-06",
      periods: ["2027-06"],
      videoLatest: [winner("asia", "asiaWin"), winner("europe", "euWin")],
      songLatest: [],
      songHits: null,
      videoHits: {
        periods: ["2027-06"],
        hits: [
          {
            video_title: "euWin",
            youtube_video_id: "euWin",
            entries: [{ period: "2027-06", rank: 2 }],
          },
          {
            video_title: "asiaWin",
            youtube_video_id: "asiaWin",
            entries: [{ period: "2027-06", rank: 7 }],
          },
        ],
      },
    });

    expect(rows.map((row) => [row.year, row.region, row.rank])).toEqual([
      ["2027", "Europe", 2],
      ["2027", "Asia", 7],
    ]);
  });
});

describe("esc winner insight blocks", () => {
  it("returns table results for Build-up rank and Uncrowned", () => {
    const ctx = fixtureContext();
    const buildUp = escBuildUpRank.compute(ctx, escBuildUpRank.defaultParams);
    const uncrowned = escUncrowned.compute(ctx, escUncrowned.defaultParams);

    expect(buildUp?.viewKind).toBe("table");
    expect(uncrowned?.viewKind).toBe("table");
    if (
      buildUp?.viewKind === "table" &&
      uncrowned?.viewKind === "table" &&
      buildUp.tableKind === "esc_winner" &&
      uncrowned.tableKind === "esc_winner"
    ) {
      expect(buildUp.showHitColumn).toBe(false);
      expect(buildUp.showRankColumn).toBe(true);
      expect(buildUp.rankColumnLabel).toBe("Build-up rank");
      expect(uncrowned.showHitColumn).toBe(false);
      expect(uncrowned.showRankColumn).toBe(true);
      expect(uncrowned.rankColumnLabel).toBe("Best rank");
      expect(buildUp.showRegionColumn).toBe(true);
      expect(uncrowned.showRegionColumn).toBe(true);
      expect(buildUp.rows.every((row) => row.region === "Europe")).toBe(true);
      expect(buildUp.rows.length).toBe(5);
      expect(uncrowned.rows).toHaveLength(1);
      expect(uncrowned.rows[0]).toMatchObject({
        year: "2025",
        rank: 2,
      });
    }
  });

  it("returns null for Uncrowned when no qualifying years", () => {
    const result = escUncrowned.compute(
      {
        episodesBrowser: null,
        latestPeriod: "2024-05",
        periods: ["2024-05"],
        videoLatest: [],
        songLatest: [],
        songHits: null,
        videoHits: { periods: ["2024-05"], hits: [] },
      },
      {},
    );

    expect(result).toBeNull();
  });
});

describe("computeBuildUpRankRows integration", () => {
  it("matches packaged data ranks (song-hits window, May Y-1 through Apr Y)", () => {
    const rows = computeBuildUpRankRows(fixtureContext());
    const byYear = Object.fromEntries(rows.map((row) => [row.year, row.rankLabel]));
    expect(byYear).toEqual({
      "2022": "2 of 17",
      "2023": "3 of 20",
      "2024": "5 of 22",
      "2025": "5 of 20",
      "2026": "5 of 21",
    });
  });
});
