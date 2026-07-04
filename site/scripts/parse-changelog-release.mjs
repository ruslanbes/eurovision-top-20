/**
 * Parse the latest **released** Keep a Changelog section (skips [Unreleased]).
 *
 * @param {string} content
 * @returns {{ version: string, releaseDate: string }}
 */
export function parseLatestRelease(content) {
  for (const line of content.split("\n")) {
    const match = line.match(/^## \[([^\]]+)\] - (\d{4}-\d{2}-\d{2})\s*$/);
    if (!match) {
      continue;
    }
    const [, version, releaseDate] = match;
    if (version === "Unreleased") {
      continue;
    }
    return { version, releaseDate };
  }

  throw new Error("No released version found in CHANGELOG.md");
}

export const REPO_URL = "https://github.com/ruslanbes/eurovision-top-20";
