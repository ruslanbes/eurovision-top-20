import { describe, expect, it } from "vitest";
import { buildEpisodesSeoIndex } from "./buildEpisodesSeoIndex";
import { loadEpisodesBrowserDataFromFs } from "./loadEpisodesBrowserDataFromFs";

describe("buildEpisodesSeoIndex", () => {
  it("lists every episode month with ranked video titles", () => {
    const { browser } = loadEpisodesBrowserDataFromFs();
    const index = buildEpisodesSeoIndex(browser);

    expect(index.length).toBe(browser.episodes.length);
    expect(index.length).toBeGreaterThan(50);

    const latest = index[index.length - 1]!;
    expect(latest.period).toMatch(/^\d{4}-\d{2}$/);
    expect(latest.entries.length).toBeGreaterThan(0);
    expect(latest.entries[0]!.rank).toBeGreaterThanOrEqual(1);
    expect(latest.entries[0]!.title.length).toBeGreaterThan(0);
  });
});
