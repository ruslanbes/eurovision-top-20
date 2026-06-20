import { describe, expect, it } from "vitest";
import { buildOriginalRanks } from "../sort";
import type { VideoStatsRow } from "../types";

const ROWS: VideoStatsRow[] = [
  {
    video_title: "A",
    chart_points: 30,
    top1: 1,
    top3: 1,
    top5: 1,
    top10: 1,
    top20: 1,
    esc_final_place: 1,
    fire: false,
    youtube_video_id: "a",
    youtube_watch_url: null,
    artist: null,
    song: null,
    flag: null,
    country: "Sweden",
    performance_category: null,
    year: 2024,
    metadata_extractor: null,
  },
  {
    video_title: "B",
    chart_points: 20,
    top1: 0,
    top3: 1,
    top5: 1,
    top10: 1,
    top20: 1,
    esc_final_place: 2,
    fire: false,
    youtube_video_id: "b",
    youtube_watch_url: null,
    artist: null,
    song: null,
    flag: null,
    country: "Norway",
    performance_category: null,
    year: 2024,
    metadata_extractor: null,
  },
  {
    video_title: "C",
    chart_points: 10,
    top1: 0,
    top3: 0,
    top5: 1,
    top10: 1,
    top20: 1,
    esc_final_place: 3,
    fire: false,
    youtube_video_id: "c",
    youtube_watch_url: null,
    artist: null,
    song: null,
    flag: null,
    country: "Sweden",
    performance_category: null,
    year: 2023,
    metadata_extractor: null,
  },
];

describe("buildOriginalRanks", () => {
  it("assigns ranks from the unfiltered list under default sort", () => {
    const ranks = buildOriginalRanks(ROWS, [{ id: "chart_points", desc: true }], "video");
    expect(ranks.get("a")).toBe(1);
    expect(ranks.get("b")).toBe(2);
    expect(ranks.get("c")).toBe(3);
  });

  it("ignores user sort direction when ranking by chart points", () => {
    const desc = buildOriginalRanks(ROWS, [{ id: "chart_points", desc: true }], "video");
    const asc = buildOriginalRanks(ROWS, [{ id: "chart_points", desc: false }], "video");
    expect(desc.get("c")).toBe(3);
    expect(asc.get("c")).toBe(1);
  });
});
