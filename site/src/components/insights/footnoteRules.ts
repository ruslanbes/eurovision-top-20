import { songMetaLookupKey } from "../stats/songMetaLookupKey";
import footnotesPayload from "../../generated/insightRowFootnotes.json";
import type {
  InsightLabelEpisodesRow,
  InsightResult,
  InsightTableRow,
} from "./types";

export type LabelEpisodesFootnoteMatch = {
  artist: string;
  song: string;
  periods_all?: string[];
  periods_any?: string[];
};

export type EscWinnerFootnoteMatch = {
  contest_year: number | number[];
};

type FootnoteRuleBase = {
  id: string;
  insight_ids: string[];
  note: string;
};

export type LabelEpisodesFootnoteRule = FootnoteRuleBase & {
  match: LabelEpisodesFootnoteMatch;
  table_kind: "label_episodes";
};

export type EscWinnerFootnoteRule = FootnoteRuleBase & {
  match: EscWinnerFootnoteMatch;
  table_kind: "esc_winner";
};

export type InsightRowFootnoteRule =
  | LabelEpisodesFootnoteRule
  | EscWinnerFootnoteRule;

export type InsightRowFootnotesPayload = {
  rules: InsightRowFootnoteRule[];
  schema_version: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseStringArray(value: unknown, field: string): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${field} must be an array of strings`);
  }
  return value;
}

function parseLabelEpisodesMatch(value: unknown): LabelEpisodesFootnoteMatch {
  if (!isRecord(value)) {
    throw new Error("match must be an object");
  }

  const artist = value.artist;
  const song = value.song;
  if (typeof artist !== "string" || !artist.trim()) {
    throw new Error("match.artist must be a non-empty string");
  }
  if (typeof song !== "string" || !song.trim()) {
    throw new Error("match.song must be a non-empty string");
  }

  const periods_any = parseStringArray(value.periods_any, "match.periods_any");
  const periods_all = parseStringArray(value.periods_all, "match.periods_all");
  if (periods_any && periods_all) {
    throw new Error("match cannot set both periods_any and periods_all");
  }

  return { artist, song, periods_any, periods_all };
}

function parseContestYear(value: unknown): number | number[] {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }
  if (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => typeof item === "number" && Number.isInteger(item))
  ) {
    return value;
  }
  throw new Error("match.contest_year must be an integer or array of integers");
}

function parseEscWinnerMatch(value: unknown): EscWinnerFootnoteMatch {
  if (!isRecord(value)) {
    throw new Error("match must be an object");
  }
  if (value.artist !== undefined || value.song !== undefined) {
    throw new Error("esc_winner match must use contest_year only");
  }
  return { contest_year: parseContestYear(value.contest_year) };
}

function parseRule(value: unknown): InsightRowFootnoteRule {
  if (!isRecord(value)) {
    throw new Error("rule must be an object");
  }

  const id = value.id;
  if (typeof id !== "string" || !id.trim()) {
    throw new Error("rule.id must be a non-empty string");
  }

  const table_kind = value.table_kind;
  if (table_kind !== "label_episodes" && table_kind !== "esc_winner") {
    throw new Error(`rule ${id}: unsupported table_kind ${String(table_kind)}`);
  }

  const insight_ids = parseStringArray(value.insight_ids, "rule.insight_ids");
  if (!insight_ids || insight_ids.length === 0) {
    throw new Error(`rule ${id}: insight_ids must be a non-empty array`);
  }

  const note = value.note;
  if (typeof note !== "string" || !note.trim()) {
    throw new Error(`rule ${id}: note must be a non-empty string`);
  }

  const base = { id, insight_ids, note };

  if (table_kind === "label_episodes") {
    return {
      ...base,
      table_kind,
      match: parseLabelEpisodesMatch(value.match),
    };
  }

  return {
    ...base,
    table_kind,
    match: parseEscWinnerMatch(value.match),
  };
}

export function parseFootnoteRules(
  payload: unknown,
  options?: { knownInsightIds?: readonly string[] },
): InsightRowFootnoteRule[] {
  if (!isRecord(payload)) {
    throw new Error("insight-row-footnotes payload must be an object");
  }
  if (payload.schema_version !== 1) {
    throw new Error(`unsupported schema_version: ${payload.schema_version}`);
  }
  if (!Array.isArray(payload.rules)) {
    throw new Error("rules must be an array");
  }

  const rules = payload.rules.map(parseRule);
  const seenIds = new Set<string>();
  for (const rule of rules) {
    if (seenIds.has(rule.id)) {
      throw new Error(`duplicate rule id: ${rule.id}`);
    }
    seenIds.add(rule.id);
  }

  if (options?.knownInsightIds) {
    const known = new Set(options.knownInsightIds);
    for (const rule of rules) {
      for (const insightId of rule.insight_ids) {
        if (!known.has(insightId)) {
          throw new Error(`rule ${rule.id}: unknown insight_id ${insightId}`);
        }
      }
    }
  }

  return rules;
}

let cachedRules: InsightRowFootnoteRule[] | null = null;

export function getFootnoteRules(): InsightRowFootnoteRule[] {
  if (!cachedRules) {
    cachedRules = parseFootnoteRules(footnotesPayload);
  }
  return cachedRules;
}

function rowPeriods(row: InsightLabelEpisodesRow): Set<string> {
  return new Set(row.episodes.map((episode) => episode.period));
}

function labelEpisodesRuleMatchesRow(
  row: InsightLabelEpisodesRow,
  rule: LabelEpisodesFootnoteRule,
): boolean {
  const ruleKey = songMetaLookupKey(rule.match.artist, rule.match.song);
  if (row.id !== ruleKey) {
    return false;
  }

  const periods = rowPeriods(row);
  if (rule.match.periods_any) {
    return rule.match.periods_any.some((period) => periods.has(period));
  }
  if (rule.match.periods_all) {
    return rule.match.periods_all.every((period) => periods.has(period));
  }

  return true;
}

function escWinnerRuleMatchesRow(
  row: InsightTableRow,
  rule: EscWinnerFootnoteRule,
): boolean {
  const year = Number.parseInt(row.year, 10);
  if (!Number.isInteger(year)) {
    return false;
  }

  const contestYears = Array.isArray(rule.match.contest_year)
    ? rule.match.contest_year
    : [rule.match.contest_year];
  return contestYears.includes(year);
}

export function applyLabelEpisodesRowFootnotes(
  insightId: string,
  rows: InsightLabelEpisodesRow[],
  rules: InsightRowFootnoteRule[],
): InsightLabelEpisodesRow[] {
  const applicable = rules.filter(
    (rule): rule is LabelEpisodesFootnoteRule =>
      rule.table_kind === "label_episodes" && rule.insight_ids.includes(insightId),
  );
  if (applicable.length === 0) {
    return rows;
  }

  return rows.map((row) => {
    const match = applicable.find((rule) => labelEpisodesRuleMatchesRow(row, rule));
    if (!match) {
      return row;
    }
    return { ...row, rowNote: match.note };
  });
}

export function applyEscWinnerRowFootnotes(
  insightId: string,
  rows: InsightTableRow[],
  rules: InsightRowFootnoteRule[],
): InsightTableRow[] {
  const applicable = rules.filter(
    (rule): rule is EscWinnerFootnoteRule =>
      rule.table_kind === "esc_winner" && rule.insight_ids.includes(insightId),
  );
  if (applicable.length === 0) {
    return rows;
  }

  return rows.map((row) => {
    const match = applicable.find((rule) => escWinnerRuleMatchesRow(row, rule));
    if (!match) {
      return row;
    }
    return { ...row, rowNote: match.note };
  });
}

/** @deprecated Use applyLabelEpisodesRowFootnotes */
export const applyRowFootnotes = applyLabelEpisodesRowFootnotes;

export function applyFootnotesToInsightResult(
  insightId: string,
  result: InsightResult,
): InsightResult {
  if (result.viewKind !== "table") {
    return result;
  }

  const rules = getFootnoteRules();

  if (result.tableKind === "label_episodes") {
    return {
      ...result,
      rows: applyLabelEpisodesRowFootnotes(insightId, result.rows, rules),
    };
  }

  if (result.tableKind === "esc_winner") {
    return {
      ...result,
      rows: applyEscWinnerRowFootnotes(insightId, result.rows, rules),
    };
  }

  return result;
}
