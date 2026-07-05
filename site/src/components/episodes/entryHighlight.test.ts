import { describe, expect, it } from "vitest";

import { MISSING_DIMENSION } from "./constants";
import { resolveEntryVisualState } from "./entryHighlight";

describe("resolveEntryVisualState", () => {
  it("dims non-matching entries in search mode", () => {
    expect(
      resolveEntryVisualState("a", "LIVE Grand Final", {
        source: "search",
        searchQuery: "live",
        focusedDimension: null,
      }),
    ).toBe("focused");
    expect(
      resolveEntryVisualState("b", "Official Video", {
        source: "search",
        searchQuery: "live",
        focusedDimension: null,
      }),
    ).toBe("dimmed");
  });

  it("uses click focus when source is click", () => {
    expect(
      resolveEntryVisualState("song-a", "Artist — Song", {
        source: "click",
        searchQuery: "ignored",
        focusedDimension: "song-a",
      }),
    ).toBe("focused");
    expect(
      resolveEntryVisualState("song-b", "Other — Track", {
        source: "click",
        searchQuery: "ignored",
        focusedDimension: "song-a",
      }),
    ).toBe("dimmed");
  });

  it("ignores stale search text while click mode is active", () => {
    expect(
      resolveEntryVisualState("song-a", "Artist — Song", {
        source: "click",
        searchQuery: "other",
        focusedDimension: "song-a",
      }),
    ).toBe("focused");
  });

  it("dims missing slots under search", () => {
    expect(
      resolveEntryVisualState(MISSING_DIMENSION, "", {
        source: "search",
        searchQuery: "x",
        focusedDimension: null,
      }),
    ).toBe("dimmed");
  });
});
