import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  computeDominantLeaders,
  dominantLeadersSong,
  type DominantLeadersParams,
} from "./insights/dominantLeaders";
import type { ChartPointsRow } from "./insights/dominantLeaders";
import type { SongStatsRow, VideoStatsRow } from "../stats/types";

const DEFAULT_PARAMS: DominantLeadersParams = {
  relativeGap: 0.25,
  absoluteGap: 50,
  maxClusterSize: 3,
};

function row(title: string, chartPoints: number): ChartPointsRow {
  return {
    video_title: title,
    chart_points: chartPoints,
    youtube_watch_url: null,
    artist: null,
    song: null,
    top1: 0,
    top3: 0,
    top5: 0,
    top10: 0,
    top20: 0,
    esc_final_place: null,
    fire: false,
    youtube_video_id: "",
    flag: null,
    country: null,
    performance_category: null,
    year: null,
    metadata_extractor: null,
  };
}

describe("computeDominantLeaders", () => {
  it("returns a cluster when relative and absolute gaps pass", () => {
    const match = computeDominantLeaders(
      [row("a", 600), row("b", 560), row("c", 300), row("d", 100)],
      DEFAULT_PARAMS,
    );

    expect(match).not.toBeNull();
    expect(match?.cutRank).toBe(2);
    expect(match?.gapToNext).toBe(260);
    expect(match?.cluster.map((item) => item.video_title)).toEqual(["a", "b"]);
  });

  it("returns null when relative gap is too small for any cut", () => {
    const match = computeDominantLeaders(
      [row("a", 100), row("b", 98), row("c", 96), row("d", 94)],
      DEFAULT_PARAMS,
    );

    expect(match).toBeNull();
  });

  it("returns null when the smallest qualifying cut exceeds maxClusterSize", () => {
    const match = computeDominantLeaders(
      [row("a", 400), row("b", 398), row("c", 396), row("d", 394), row("e", 50)],
      DEFAULT_PARAMS,
    );

    expect(match).toBeNull();
  });

  it("returns null when absolute gap is below the floor", () => {
    const match = computeDominantLeaders(
      [row("a", 55), row("b", 50), row("c", 48)],
      DEFAULT_PARAMS,
    );

    expect(match).toBeNull();
  });

  it("uses zero as the next rank after the final row", () => {
    const match = computeDominantLeaders(
      [row("a", 100), row("b", 70), row("c", 40)],
      DEFAULT_PARAMS,
    );

    expect(match).toBeNull();
  });
});

describe("dominantLeaders insight integration", () => {
  it("matches expected video cut on packaged latest snapshot shape", () => {
    const snapshotPath = join(
      process.cwd(),
      "..",
      "data/packaged/per-video/alltime/eurovision-top-20-alltime-latest.json",
    );
    const snapshot = JSON.parse(readFileSync(snapshotPath, "utf-8")) as {
      rows: ChartPointsRow[];
    };

    const match = computeDominantLeaders(snapshot.rows, DEFAULT_PARAMS);
    expect(match?.cutRank).toBe(2);
    expect(match?.gapToNext).toBe(164);
  });

  it("links song-grain items via canonical member watch URLs", () => {
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

    const result = dominantLeadersSong.compute(
      { latestPeriod: "2026-06", videoLatest: videoRows, songLatest: songRows },
      dominantLeadersSong.defaultParams,
    );

    expect(result?.viewKind).toBe("highlight");
    if (result?.viewKind !== "highlight") {
      return;
    }
    expect(result.items.length).toBeGreaterThan(0);
    for (const item of result.items) {
      expect(item.href).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=/);
    }
  });
});
