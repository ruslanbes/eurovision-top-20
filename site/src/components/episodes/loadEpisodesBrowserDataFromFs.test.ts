import { describe, expect, it } from "vitest";
import { loadEpisodesBrowserDataFromFs } from "./loadEpisodesBrowserDataFromFs";

describe("loadEpisodesBrowserDataFromFs", () => {
  it("loads full browser grid and year colors from packaged data", () => {
    const data = loadEpisodesBrowserDataFromFs();
    expect(data.browser.episodes.length).toBeGreaterThan(50);
    expect(data.browser.entry_capacity).toBe(20);
    const latest = data.browser.episodes[data.browser.episodes.length - 1]!;
    expect(latest.entries.length).toBe(20);
    const filled = latest.entries.find((e) => !("missing" in e && e.missing));
    expect(filled && "video_title" in filled && filled.video_title.length).toBeGreaterThan(0);
    expect(Object.keys(data.yearColors.colors).length).toBeGreaterThan(5);
  });
});
