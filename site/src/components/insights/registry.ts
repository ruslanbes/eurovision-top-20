import { alwaysSecondVideo } from "./insights/alwaysSecond";
import { dominantLeadersSong, dominantLeadersVideo } from "./insights/dominantLeaders";
import { escAprilPulse, escUncrowned } from "./insights/escWinnerInsights";
import { multiVersionEpisode } from "./insights/multiVersionEpisode";
import { postMayDebut } from "./insights/postMayDebut";
import { yearClassics } from "./insights/yearClassics";
import type { InsightDefinition, InsightSection } from "./types";

/** Stable page order — append new insights here when registering. */
const INSIGHT_ORDER: InsightDefinition[] = [
  yearClassics,
  escAprilPulse,
  escUncrowned,
  dominantLeadersVideo,
  dominantLeadersSong,
  alwaysSecondVideo,
  multiVersionEpisode,
  postMayDebut,
];

const insightsById = Object.fromEntries(
  INSIGHT_ORDER.map((insight) => [insight.id, insight]),
) as Record<string, InsightDefinition>;

export function listInsights(): InsightDefinition[] {
  return INSIGHT_ORDER;
}

export function getInsight(id: string): InsightDefinition | undefined {
  return insightsById[id];
}

export function listInsightsBySection(): [InsightSection, InsightDefinition[]][] {
  const grouped = new Map<InsightSection, InsightDefinition[]>();
  for (const insight of INSIGHT_ORDER) {
    const sectionInsights = grouped.get(insight.section) ?? [];
    sectionInsights.push(insight);
    grouped.set(insight.section, sectionInsights);
  }

  const order: InsightSection[] = ["year", "esc_winner", "other"];
  return order
    .filter((section) => grouped.has(section))
    .map((section) => [section, grouped.get(section)!]);
}
