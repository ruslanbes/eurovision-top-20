import { describe, expect, it } from "vitest";

import {
  defaultEpisodeScheme,
  getEpisodeScheme,
  listEpisodeSchemes,
} from "./registry";

describe("episode scheme registry", () => {
  it("lists schemes in stable order", () => {
    const schemes = listEpisodeSchemes();
    expect(schemes.map((scheme) => scheme.id)).toEqual([
      "country",
      "year",
      "esc-winner",
      "fire",
    ]);
  });

  it("resolves schemes by id", () => {
    expect(getEpisodeScheme("year")?.label).toBe("Contest year");
    expect(getEpisodeScheme("missing")).toBeUndefined();
  });

  it("defaults to year", () => {
    expect(defaultEpisodeScheme().id).toBe("country");
  });
});
