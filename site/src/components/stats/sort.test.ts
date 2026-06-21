import { describe, expect, it } from "vitest";
import { escFinalPlaceSortKey } from "./escFinalPlace";
import { DEFAULT_VIDEO_SORT, sortStatsRows } from "./sort";
import type { VideoStatsRow } from "./types";

function videoRow(overrides: Partial<VideoStatsRow>): VideoStatsRow {
  return {
    video_title: "Title",
    chart_points: 10,
    top1: 0,
    top3: 0,
    top5: 0,
    top10: 1,
    top20: 1,
    esc_final_place: 5,
    fire: false,
    youtube_video_id: "abc",
    youtube_watch_url: null,
    artist: null,
    song: null,
    flag: null,
    country: "Sweden",
    performance_category: null,
    year: 2020,
    metadata_extractor: null,
    ...overrides,
  };
}

describe("DEFAULT_VIDEO_SORT", () => {
  it("includes esc place and year before the title tie-breaker", () => {
    expect(DEFAULT_VIDEO_SORT.map((entry) => entry.id)).toEqual([
      "chart_points",
      "top1",
      "top3",
      "top5",
      "top10",
      "top20",
      "esc_final_place",
      "year",
      "video_title",
    ]);
  });
});

describe("sortStatsRows", () => {
  it("breaks ties by esc place asc, then year desc, then title", () => {
    const rows = [
      videoRow({ video_title: "Zebra", esc_final_place: 10, year: 2018 }),
      videoRow({ video_title: "Alpha", esc_final_place: 2, year: 2024 }),
      videoRow({ video_title: "Beta", esc_final_place: 2, year: 2020 }),
    ];
    const sorted = sortStatsRows(rows, DEFAULT_VIDEO_SORT, "video");
    expect(sorted.map((row) => row.video_title)).toEqual(["Alpha", "Beta", "Zebra"]);
  });

  it("matches escFinalPlaceSortKey ordering for special codes", () => {
    expect(escFinalPlaceSortKey(1)).toBeLessThan(escFinalPlaceSortKey("DNQ"));
    expect(escFinalPlaceSortKey("DNQ")).toBeLessThan(escFinalPlaceSortKey(null));
  });
});
