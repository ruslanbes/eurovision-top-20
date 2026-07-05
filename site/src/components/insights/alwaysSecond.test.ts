import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { VideoStatsRow } from "../stats/types";
import {
  alwaysSecondVideo,
  computeAlwaysSecond,
} from "./insights/alwaysSecond";

function videoRow(
  overrides: Partial<VideoStatsRow> & Pick<VideoStatsRow, "video_title" | "chart_points">,
): VideoStatsRow {
  return {
    artist: null,
    country: null,
    esc_final_place: null,
    fire: false,
    flag: null,
    metadata_extractor: null,
    performance_category: null,
    song: null,
    top1: 0,
    top3: 0,
    top5: 0,
    top10: 0,
    top20: 0,
    year: null,
    youtube_video_id: "",
    youtube_watch_url: null,
    ...overrides,
  };
}

describe("computeAlwaysSecond", () => {
  it("excludes uploads that ever hit rank 1", () => {
    const leaders = computeAlwaysSecond([
      videoRow({ video_title: "Winner replay", chart_points: 900, top1: 5 }),
      videoRow({ video_title: "Bridesmaid A", chart_points: 400, top3: 2 }),
      videoRow({ video_title: "Bridesmaid B", chart_points: 300, top10: 4 }),
    ]);

    expect(leaders.map((row) => row.video_title)).toEqual(["Bridesmaid A"]);
  });

  it("returns ties at the top chart_points", () => {
    const leaders = computeAlwaysSecond([
      videoRow({ video_title: "Tie A", chart_points: 500, top5: 1 }),
      videoRow({ video_title: "Tie B", chart_points: 500, top10: 3 }),
      videoRow({ video_title: "Lower", chart_points: 100, top20: 1 }),
    ]);

    expect(leaders.map((row) => row.video_title).sort()).toEqual(["Tie A", "Tie B"]);
  });

  it("uses default stats tie-break when chart_points match", () => {
    const leaders = computeAlwaysSecond([
      videoRow({
        video_title: "Later year",
        chart_points: 500,
        top10: 2,
        year: 2020,
      }),
      videoRow({
        video_title: "Earlier year",
        chart_points: 500,
        top10: 2,
        year: 2019,
      }),
    ]);

    expect(leaders).toHaveLength(2);
    expect(leaders.every((row) => row.chart_points === 500)).toBe(true);
  });
});

describe("alwaysSecond integration", () => {
  it("finds a never-top1 leader on packaged latest data", () => {
    const repoRoot = join(process.cwd(), "..");
    const videoRows = JSON.parse(
      readFileSync(
        join(repoRoot, "data/packaged/per-video/alltime/eurovision-top-20-alltime-latest.json"),
        "utf-8",
      ),
    ).rows as VideoStatsRow[];

    const leaders = computeAlwaysSecond(videoRows);
    expect(leaders.length).toBeGreaterThan(0);
    expect(leaders.every((row) => row.top1 === 0)).toBe(true);

    const result = alwaysSecondVideo.compute(
      {
        episodesBrowser: null,
        latestPeriod: "2026-06",
        periods: [],
        songLatest: [],
        videoHits: null,
        videoLatest: videoRows,
      },
      {},
    );

    expect(result?.viewKind).toBe("highlight");
    if (result?.viewKind === "highlight") {
      expect(result.title).toBe("Always second");
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items[0]?.label.length).toBeGreaterThan(0);
    }
  });
});
