import { describe, expect, it } from "vitest";
import { buildDefaultStatsRows } from "./buildDefaultStatsRows";

describe("buildDefaultStatsRows", () => {
  it("returns full-corpus video rows sorted by chart points", () => {
    const { rows, periods } = buildDefaultStatsRows("video");
    expect(periods.length).toBeGreaterThan(10);
    expect(rows.length).toBeGreaterThan(50);
    const videoRows = rows as { video_title: string; chart_points: number }[];
    expect(videoRows[0]?.video_title.length).toBeGreaterThan(0);
    expect(videoRows[0]?.chart_points).toBeGreaterThan(0);
    for (let i = 1; i < Math.min(videoRows.length, 20); i++) {
      expect(videoRows[i - 1]!.chart_points).toBeGreaterThanOrEqual(
        videoRows[i]!.chart_points,
      );
    }
  });

  it("returns full-corpus song rows with artist — song labels", () => {
    const { rows, periods } = buildDefaultStatsRows("song");
    expect(periods.length).toBeGreaterThan(10);
    expect(rows.length).toBeGreaterThan(50);
    const songRows = rows as { artist: string; song: string; chart_points: number }[];
    expect(songRows[0]?.artist.length).toBeGreaterThan(0);
    expect(songRows[0]?.song.length).toBeGreaterThan(0);
    expect(songRows[0]?.chart_points).toBeGreaterThan(0);
  });
});
