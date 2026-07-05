import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildEpisodeRankIndex } from "./escWinnerData";
import {
  computeEscWinnerTableRows,
  escAprilPulse,
  escMayCrown,
} from "./insights/escWinnerInsights";
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
    const y2018 = rows.find((row) => row.year === "2018");
    const y2026 = rows.find((row) => row.year === "2026");

    expect(y2018?.rank).toBe(1);
    expect(y2018?.linkHref).toMatch(/youtube\.com/);
    expect(y2026?.rank).toBe(19);
  });

  it("marks May rank-1 hits", () => {
    const ctx = fixtureContext();
    const rows = computeEscWinnerTableRows(ctx, escMayCrown.defaultParams);
    const y2024 = rows.find((row) => row.year === "2024");
    const y2025 = rows.find((row) => row.year === "2025");

    expect(y2024?.status).toBe("yes");
    expect(y2025?.status).toBe("no");
    expect(y2025?.statusTitle).toMatch(/Rank 2/);
  });
});

describe("esc winner insight blocks", () => {
  it("returns table results with three columns worth of row data", () => {
    const ctx = fixtureContext();
    const april = escAprilPulse.compute(ctx, escAprilPulse.defaultParams);
    const may = escMayCrown.compute(ctx, escMayCrown.defaultParams);

    expect(april?.viewKind).toBe("table");
    expect(may?.viewKind).toBe("table");
    if (april?.viewKind === "table" && may?.viewKind === "table") {
      expect(april.showRankColumn).toBe(true);
      expect(april.showHitColumn).toBe(false);
      expect(may.showHitColumn).not.toBe(false);
      expect(april.rows.length).toBeGreaterThan(0);
      expect(april.rows[0]).toMatchObject({
        year: expect.any(String),
        status: expect.stringMatching(/yes|no|unknown/),
      });
      expect(may.rows.some((row) => row.status === "yes")).toBe(true);
    }
  });
});
