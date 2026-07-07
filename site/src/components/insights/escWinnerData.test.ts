import { describe, expect, it } from "vitest";
import { bestRankForWinnerVideos, buildEpisodeRankIndex } from "./escWinnerData";
import type { VideoStatsRow } from "../stats/types";

function winnerRow(title: string, overrides: Partial<VideoStatsRow> = {}): VideoStatsRow {
  return {
    video_title: title,
    chart_points: 0,
    youtube_video_id: "id",
    youtube_watch_url: null,
    artist: null,
    song: null,
    top1: 0,
    top3: 0,
    top5: 0,
    top10: 0,
    top20: 0,
    esc_final_place: 1,
    fire: false,
    flag: null,
    country: null,
    performance_category: null,
    year: 2025,
    metadata_extractor: null,
    ...overrides,
  };
}

describe("bestRankForWinnerVideos", () => {
  it("returns null best rank when winner never charted", () => {
    const index = buildEpisodeRankIndex({ periods: [], hits: [] });
    const result = bestRankForWinnerVideos(index, [winnerRow("Winner LIVE")]);

    expect(result).toEqual({
      bestRank: null,
      bestVideo: null,
      everTop1: false,
    });
  });

  it("returns best rank when winner peaked below #1", () => {
    const index = buildEpisodeRankIndex({
      periods: ["2025-05", "2025-06"],
      hits: [
        {
          video_title: "Winner LIVE",
          youtube_video_id: "abc",
          entries: [
            { period: "2025-05", rank: 2 },
            { period: "2025-06", rank: 4 },
          ],
        },
      ],
    });

    const result = bestRankForWinnerVideos(index, [winnerRow("Winner LIVE")]);

    expect(result.bestRank).toBe(2);
    expect(result.everTop1).toBe(false);
    expect(result.bestVideo?.video_title).toBe("Winner LIVE");
  });

  it("marks everTop1 when any winner video hit rank 1 in any period", () => {
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

    const result = bestRankForWinnerVideos(index, [winnerRow("Winner LIVE")]);

    expect(result.bestRank).toBe(1);
    expect(result.everTop1).toBe(true);
  });

  it("uses the best rank across multiple winner videos", () => {
    const index = buildEpisodeRankIndex({
      periods: ["2017-05"],
      hits: [
        {
          video_title: "Semi LIVE",
          youtube_video_id: "semi",
          entries: [{ period: "2017-05", rank: 2 }],
        },
        {
          video_title: "Grand LIVE",
          youtube_video_id: "grand",
          entries: [{ period: "2017-05", rank: 1 }],
        },
      ],
    });

    const result = bestRankForWinnerVideos(index, [
      winnerRow("Semi LIVE", { year: 2017 }),
      winnerRow("Grand LIVE", { year: 2017 }),
    ]);

    expect(result.bestRank).toBe(1);
    expect(result.everTop1).toBe(true);
  });
});
