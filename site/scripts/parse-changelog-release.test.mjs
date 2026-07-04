import { describe, expect, it } from "vitest";

import { parseLatestRelease } from "./parse-changelog-release.mjs";

describe("parseLatestRelease", () => {
  it("skips Unreleased and returns the first dated release", () => {
    const content = `# Changelog

## [Unreleased]

### Added

- Something new

## [0.3.2] - 2026-06-24

Shipped.

## [0.3.1] - 2026-06-22

Older.
`;
    expect(parseLatestRelease(content)).toEqual({
      version: "0.3.2",
      releaseDate: "2026-06-24",
    });
  });

  it("throws when no released section exists", () => {
    expect(() =>
      parseLatestRelease("# Changelog\n\n## [Unreleased]\n"),
    ).toThrow(/No released version/);
  });
});
