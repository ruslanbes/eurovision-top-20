import { describe, expect, it } from "vitest";
import {
  canonicalSongWatchUrl,
  compareMemberPrecedence,
  pickCanonicalSongMember,
} from "./canonicalSongMember";
import type { VideoStatsRow } from "./types";

function videoRow(overrides: Partial<VideoStatsRow> & Pick<VideoStatsRow, "video_title">): VideoStatsRow {
  return {
    top1: 0,
    top3: 0,
    top5: 0,
    top10: 0,
    top20: 0,
    chart_points: 0,
    esc_final_place: null,
    fire: false,
    youtube_video_id: "",
    youtube_watch_url: null,
    artist: "Artist A",
    song: "Song One",
    flag: "🇳🇴",
    country: "Norway",
    performance_category: "official_video",
    year: 2020,
    metadata_extractor: null,
    ...overrides,
  };
}

describe("pickCanonicalSongMember", () => {
  it("prefers the member with higher chart_points", () => {
    const live = videoRow({
      video_title: "live",
      chart_points: 10,
      youtube_watch_url: "https://www.youtube.com/watch?v=lowvid",
      youtube_video_id: "lowvid",
      performance_category: "final_live",
    });
    const official = videoRow({
      video_title: "official",
      chart_points: 100,
      youtube_watch_url: "https://www.youtube.com/watch?v=highvid",
      youtube_video_id: "highvid",
      performance_category: "official_video",
    });

    const canonical = pickCanonicalSongMember([live, official]);
    expect(canonical.youtube_video_id).toBe("highvid");
    expect(compareMemberPrecedence(official, live)).toBeGreaterThan(0);
  });
});

describe("canonicalSongWatchUrl", () => {
  it("returns the watch URL of the highest chart_points variant", () => {
    const url = canonicalSongWatchUrl("Artist A", "Song One", [
      videoRow({
        video_title: "low",
        chart_points: 5,
        youtube_watch_url: "https://www.youtube.com/watch?v=lowvid",
      }),
      videoRow({
        video_title: "high",
        chart_points: 50,
        youtube_watch_url: "https://www.youtube.com/watch?v=highvid",
      }),
    ]);

    expect(url).toBe("https://www.youtube.com/watch?v=highvid");
  });
});
