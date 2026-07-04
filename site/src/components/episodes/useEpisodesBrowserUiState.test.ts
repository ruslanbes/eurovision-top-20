import { describe, expect, it } from "vitest";

import { createInitialEpisodesBrowserUiState } from "./useEpisodesBrowserUiState";

describe("createInitialEpisodesBrowserUiState", () => {
  it("defaults to the given scheme with Group off", () => {
    expect(createInitialEpisodesBrowserUiState("year")).toEqual({
      schemeId: "year",
      groupEnabled: false,
    });
  });
});
