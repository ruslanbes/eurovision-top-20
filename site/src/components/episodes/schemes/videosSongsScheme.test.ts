import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import episodeSchemeColors from "../../../generated/episodeSchemeColors.json";
import { buildSongsSchemeContext, buildVideosSchemeContext } from "../schemeContext";
import { songsScheme } from "./songsScheme";
import { videosScheme } from "./videosScheme";
import type { BrowserFilledEntry } from "../types";

const missingColor = "rgb(var(--chart-missing))";

function entryFromTitle(videoTitle: string): BrowserFilledEntry {
  return {
    artist: "Artist",
    country: "Country",
    esc_final_place: 10,
    fire: false,
    flag: "🏳️",
    performance_category: "live",
    rank: 1,
    song: "Song",
    video_title: videoTitle,
    year: 2020,
    youtube_video_id: "abc",
  };
}

describe("videos and songs schemes", () => {
  it("registers search highlight mode", () => {
    expect(videosScheme.highlightMode).toBe("search");
    expect(songsScheme.highlightMode).toBe("search");
    expect(videosScheme.legendItems([])).toEqual([]);
  });

  it("assigns one color per video title", () => {
    const ctx = buildVideosSchemeContext(missingColor);
    const titles = Object.keys(episodeSchemeColors.videos);
    expect(titles.length).toBeGreaterThan(1);
    const first = entryFromTitle(titles[0]!);
    const second = entryFromTitle(titles[1]!);
    const firstColor = videosScheme.entryColor(first, ctx);
    const secondColor = videosScheme.entryColor(second, ctx);
    expect(firstColor).toBe(episodeSchemeColors.videos[titles[0]!]);
    expect(firstColor).not.toBe(secondColor);
  });

  it("shares song color across videos of the same song", () => {
    const ctx = buildSongsSchemeContext(missingColor);
    const songKey = Object.keys(episodeSchemeColors.songs)[0];
    expect(songKey).toBeTruthy();
    const entry: BrowserFilledEntry = {
      artist: "Hadise",
      country: "Turkey",
      esc_final_place: 2,
      fire: false,
      flag: "🇹🇷",
      performance_category: "live",
      rank: 1,
      song: "Düm Tek Tek",
      video_title: "Hadise - Düm Tek Tek - Grand Final",
      year: 2009,
      youtube_video_id: "abc",
    };
    const alt: BrowserFilledEntry = {
      ...entry,
      video_title: "Hadise - Düm Tek Tek (Turkey)",
    };
    expect(songsScheme.entryColor(entry, ctx)).toBe(songsScheme.entryColor(alt, ctx));
  });

  it("builds packaged color maps from browser and alltime data", () => {
    const repoRoot = join(process.cwd(), "..");
    const browser = JSON.parse(
      readFileSync(join(repoRoot, "data/packaged/episodes/browser.json"), "utf-8"),
    );
    const titles = new Set(
      browser.episodes.flatMap((episode: { entries: { missing?: boolean; video_title?: string }[] }) =>
        episode.entries
          .filter((entry) => !entry.missing && entry.video_title)
          .map((entry) => entry.video_title!),
      ),
    );
    expect(Object.keys(episodeSchemeColors.videos).length).toBe(titles.size);
    expect(Object.keys(episodeSchemeColors.songs).length).toBeGreaterThan(0);
  });
});
