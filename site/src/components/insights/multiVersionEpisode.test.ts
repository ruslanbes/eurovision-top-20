import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { EpisodesBrowserPayload } from "../episodes/types";
import type { VideoHitsPayload } from "../stats/queryWindow";
import type { VideoStatsRow } from "../stats/types";
import {
  computeMultiVersionEpisodeRows,
  multiVersionEpisode,
} from "./insights/multiVersionEpisode";
import { applyFootnotesToInsightResult, getFootnoteRules } from "./footnoteRules";

describe("computeMultiVersionEpisodeRows", () => {
  it("lists songs with three videos in the same episode month", () => {
    const rows = computeMultiVersionEpisodeRows(
      {
        periods: ["2026-02"],
        hits: [
          {
            video_title: "Artist - Song | Official Video",
            youtube_video_id: "a",
            entries: [{ period: "2026-02", rank: 1 }],
          },
          {
            video_title: "Artist - Song (LIVE) | Grand Final",
            youtube_video_id: "b",
            entries: [{ period: "2026-02", rank: 2 }],
          },
          {
            video_title: "Artist - Song | National Final",
            youtube_video_id: "c",
            entries: [{ period: "2026-02", rank: 3 }],
          },
          {
            video_title: "Other - Track | Official Video",
            youtube_video_id: "d",
            entries: [{ period: "2026-02", rank: 4 }],
          },
        ],
      },
      [
        {
          video_title: "Artist - Song | Official Video",
          artist: "Artist",
          song: "Song",
          country: "Nowhere",
          flag: "🏳️",
          year: 2024,
          chart_points: 10,
          youtube_watch_url: "https://www.youtube.com/watch?v=a",
          top1: 0,
          top3: 0,
          top5: 0,
          top10: 0,
          top20: 1,
        },
        {
          video_title: "Artist - Song (LIVE) | Grand Final",
          artist: "Artist",
          song: "Song",
          country: "Nowhere",
          flag: "🏳️",
          year: 2024,
          chart_points: 5,
          youtube_watch_url: "https://www.youtube.com/watch?v=b",
          top1: 0,
          top3: 0,
          top5: 0,
          top10: 0,
          top20: 1,
        },
        {
          video_title: "Artist - Song | National Final",
          artist: "Artist",
          song: "Song",
          country: "Nowhere",
          flag: "🏳️",
          year: 2024,
          chart_points: 3,
          youtube_watch_url: "https://www.youtube.com/watch?v=c",
          top1: 0,
          top3: 0,
          top5: 0,
          top10: 0,
          top20: 1,
        },
      ] as VideoStatsRow[],
      new Map([["2026-02", "https://www.youtube.com/watch?v=episode"]]),
      { minVersions: 3 },
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.label).toBe("Artist — Song");
    expect(rows[0]?.labelHref).toBe("https://www.youtube.com/watch?v=a");
    expect(rows[0]?.episodes).toEqual([
      {
        period: "2026-02",
        label: "Feb 2026",
        href: "https://www.youtube.com/watch?v=episode",
      },
    ]);
  });
});

describe("multiVersionEpisode integration", () => {
  it("finds qualifying songs on packaged data", () => {
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
    const browser = JSON.parse(
      readFileSync(join(repoRoot, "data/packaged/episodes/browser.json"), "utf-8"),
    ) as EpisodesBrowserPayload;

    const episodeUrls = new Map(
      browser.episodes.map((episode) => [
        episode.period,
        episode.youtube_video_id
          ? `https://www.youtube.com/watch?v=${episode.youtube_video_id}`
          : null,
      ]),
    );

    const rows = computeMultiVersionEpisodeRows(
      videoHits,
      videoRows,
      episodeUrls,
      { minVersions: 3 },
    );

    expect(rows.length).toBeGreaterThan(0);

    const result = multiVersionEpisode.compute(
      {
        episodesBrowser: browser,
        latestPeriod: videoHits.periods[videoHits.periods.length - 1] ?? "",
        periods: videoHits.periods,
        songLatest: [],
        videoHits,
        videoLatest: videoRows,
      },
      { minVersions: 3 },
    );

    expect(result?.viewKind).toBe("table");
    if (result?.viewKind === "table" && result.tableKind === "label_episodes") {
      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0]?.episodes[0]?.label).toMatch(/^[A-Z][a-z]{2} \d{4}$/);

      const salvador = result.rows.find((row) =>
        row.label.includes("Salvador Sobral"),
      );
      const withFootnotes = applyFootnotesToInsightResult("multi-version-episode", result).rows;
      const salvadorWithNote = withFootnotes.find((row) =>
        row.label.includes("Salvador Sobral"),
      );
      expect(salvador).toBeDefined();
      expect(salvadorWithNote?.rowNote).toMatch(/semi-final and grand-final/i);
    }
  });
});
