import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildEpisodeRankIndex } from "./escWinnerData";
import {
  computeEscWinnerTableRows,
  computeUncrownedRows,
  escAprilPulse,
  escUncrowned,
} from "./insights/escWinnerInsights";
import { applyFootnotesToInsightResult } from "./footnoteRules";
import type { VideoHitsPayload } from "../stats/queryWindow";
import type { VideoStatsRow } from "../stats/types";
import type { InsightContext } from "./types";

function fixtureContext(): InsightContext {
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

  return {
    episodesBrowser: null,
    latestPeriod: videoHits.periods[videoHits.periods.length - 1] ?? "",
    periods: videoHits.periods,
    videoLatest: videoRows,
    songLatest: [],
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

describe("computeEscWinnerTableRows", () => {
  it("returns April ranks without hit classification", () => {
    const ctx = fixtureContext();
    const rows = computeEscWinnerTableRows(ctx, escAprilPulse.defaultParams);
    const years = rows.map((row) => Number.parseInt(row.year, 10));
    expect(years).toEqual([...years].sort((left, right) => left - right));

    const y2018 = rows.find((row) => row.year === "2018");
    const y2026 = rows.find((row) => row.year === "2026");

    expect(y2018?.rank).toBe(1);
    expect(y2018?.linkHref).toMatch(/youtube\.com/);
    expect(y2026?.rank).toBe(19);

    const y2019 = rows.find((row) => row.year === "2019");
    expect(y2019?.status).toBe("unknown");
    expect(y2019?.statusTitle).toBe("No episode");
    expect(y2019?.rank).toBeNull();
    expect(y2019?.linkLabel).toMatch(/Duncan Laurence/);

    const april = escAprilPulse.compute(ctx, escAprilPulse.defaultParams);
    const aprilWithNotes = applyFootnotesToInsightResult("esc-april-pulse", april!);
    if (
      aprilWithNotes?.viewKind === "table" &&
      aprilWithNotes.tableKind === "esc_winner"
    ) {
      const y2019Note = aprilWithNotes.rows.find((row) => row.year === "2019");
      expect(y2019Note?.rowNote).toMatch(/No April 2019 episode/);
    }
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
          flag: "🇸🇪",
          country: "Sweden",
          performance_category: "final_live",
          year: 2024,
          metadata_extractor: null,
        },
      ],
      songLatest: [],
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

describe("esc winner insight blocks", () => {
  it("returns table results for April pulse and Uncrowned", () => {
    const ctx = fixtureContext();
    const april = escAprilPulse.compute(ctx, escAprilPulse.defaultParams);
    const uncrowned = escUncrowned.compute(ctx, escUncrowned.defaultParams);

    expect(april?.viewKind).toBe("table");
    expect(uncrowned?.viewKind).toBe("table");
    if (
      april?.viewKind === "table" &&
      uncrowned?.viewKind === "table" &&
      april.tableKind === "esc_winner" &&
      uncrowned.tableKind === "esc_winner"
    ) {
      expect(april.showRankColumn).toBe(true);
      expect(april.showHitColumn).toBe(false);
      expect(uncrowned.showHitColumn).toBe(false);
      expect(uncrowned.showRankColumn).toBe(true);
      expect(uncrowned.rankColumnLabel).toBe("Best rank");
      expect(april.rows.length).toBeGreaterThan(0);
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
        videoHits: { periods: ["2024-05"], hits: [] },
      },
      {},
    );

    expect(result).toBeNull();
  });
});
