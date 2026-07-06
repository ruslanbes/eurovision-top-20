import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { songMetaLookupKey } from "../stats/songMetaLookupKey";
import { listInsights } from "./registry";
import {
  applyEscWinnerRowFootnotes,
  applyLabelEpisodesRowFootnotes,
  parseFootnoteRules,
} from "./footnoteRules";
import type { InsightLabelEpisodesRow } from "./types";

function fixtureRow(
  overrides: Partial<InsightLabelEpisodesRow> & Pick<InsightLabelEpisodesRow, "id">,
): InsightLabelEpisodesRow {
  return {
    label: "Artist — Song",
    labelHref: null,
    episodes: [{ period: "2017-05", label: "May 2017", href: null }],
    ...overrides,
  };
}

describe("parseFootnoteRules", () => {
  it("loads rules from data/metadata and validates insight ids", () => {
    const repoRoot = join(process.cwd(), "..");
    const payload = JSON.parse(
      readFileSync(
        join(repoRoot, "data/metadata/insight-row-footnotes.json"),
        "utf-8",
      ),
    );
    const rules = parseFootnoteRules(payload, {
      knownInsightIds: listInsights().map((insight) => insight.id),
    });
    expect(rules).toHaveLength(2);
    expect(rules.map((rule) => rule.id).sort()).toEqual([
      "april-pulse-2019-no-episode",
      "hat-trick-salvador-amar-2017-05",
    ]);
  });

  it("rejects duplicate rule ids", () => {
    expect(() =>
      parseFootnoteRules({
        schema_version: 1,
        rules: [
          {
            id: "dup",
            insight_ids: ["multi-version-episode"],
            table_kind: "label_episodes",
            match: { artist: "A", song: "B" },
            note: "one",
          },
          {
            id: "dup",
            insight_ids: ["multi-version-episode"],
            table_kind: "label_episodes",
            match: { artist: "C", song: "D" },
            note: "two",
          },
        ],
      }),
    ).toThrow(/duplicate rule id/);
  });

  it("rejects unsupported table_kind", () => {
    expect(() =>
      parseFootnoteRules({
        schema_version: 1,
        rules: [
          {
            id: "bad-kind",
            insight_ids: ["multi-version-episode"],
            table_kind: "ranked_songs",
            match: { artist: "A", song: "B" },
            note: "nope",
          },
        ],
      }),
    ).toThrow(/unsupported table_kind/);
  });
});

describe("applyLabelEpisodesRowFootnotes", () => {
  const salvadorRule = {
    id: "hat-trick-salvador-amar-2017-05",
    insight_ids: ["multi-version-episode"],
    table_kind: "label_episodes" as const,
    match: {
      artist: "Salvador Sobral",
      song: "Amar Pelos Dois",
      periods_any: ["2017-05"],
    },
    note: "Semi-final and grand-final charted as separate videos; later episodes merge final performances.",
  };

  it("attaches rowNote when artist, song, and period match", () => {
    const row = fixtureRow({
      id: songMetaLookupKey("Salvador Sobral", "Amar Pelos Dois"),
      label: "Salvador Sobral — Amar Pelos Dois",
    });
    const [updated] = applyLabelEpisodesRowFootnotes("multi-version-episode", [row], [
      salvadorRule,
    ]);
    expect(updated?.rowNote).toMatch(/semi-final and grand-final/i);
  });

  it("leaves row unchanged when insight id does not match", () => {
    const row = fixtureRow({
      id: songMetaLookupKey("Salvador Sobral", "Amar Pelos Dois"),
    });
    const [updated] = applyLabelEpisodesRowFootnotes("other-insight", [row], [salvadorRule]);
    expect(updated?.rowNote).toBeUndefined();
  });

  it("leaves row unchanged when required period is missing", () => {
    const row = fixtureRow({
      id: songMetaLookupKey("Salvador Sobral", "Amar Pelos Dois"),
      episodes: [{ period: "2018-05", label: "May 2018", href: null }],
    });
    const [updated] = applyLabelEpisodesRowFootnotes("multi-version-episode", [row], [
      salvadorRule,
    ]);
    expect(updated?.rowNote).toBeUndefined();
  });

  it("leaves unrelated rows unchanged", () => {
    const row = fixtureRow({ id: songMetaLookupKey("Other Artist", "Other Song") });
    const [updated] = applyLabelEpisodesRowFootnotes("multi-version-episode", [row], [
      salvadorRule,
    ]);
    expect(updated?.rowNote).toBeUndefined();
  });
});

describe("applyEscWinnerRowFootnotes", () => {
  const april2019Rule = {
    id: "april-pulse-2019-no-episode",
    insight_ids: ["esc-april-pulse"],
    table_kind: "esc_winner" as const,
    match: { contest_year: 2019 },
    note: "No April 2019 episode — the channel skipped from February to May that year.",
  };

  it("attaches rowNote for matching contest year", () => {
    const [updated] = applyEscWinnerRowFootnotes(
      "esc-april-pulse",
      [
        {
          year: "2019",
          status: "unknown",
          statusTitle: "No episode",
          rank: null,
          linkLabel: "Duncan Laurence — Arcade",
          linkHref: "https://www.youtube.com/watch?v=example",
        },
      ],
      [april2019Rule],
    );
    expect(updated?.rowNote).toMatch(/No April 2019 episode/);
  });

  it("leaves row unchanged when insight id does not match", () => {
    const [updated] = applyEscWinnerRowFootnotes(
      "esc-may-crown",
      [{ year: "2019", status: "yes", rank: 1, linkLabel: null, linkHref: null }],
      [april2019Rule],
    );
    expect(updated?.rowNote).toBeUndefined();
  });

  it("leaves row unchanged when contest year does not match", () => {
    const [updated] = applyEscWinnerRowFootnotes(
      "esc-april-pulse",
      [{ year: "2018", status: "unknown", rank: null, linkLabel: null, linkHref: null }],
      [april2019Rule],
    );
    expect(updated?.rowNote).toBeUndefined();
  });
});
