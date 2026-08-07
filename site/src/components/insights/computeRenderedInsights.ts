import { collectDataNeeds } from "./context";
import { applyFootnotesToInsightResult } from "./footnoteRules";
import {
  loadInsightContextFromFs,
  resolveInsightDataRoot,
} from "./loadInsightContextFromFs";
import { listInsights } from "./registry";
import type { InsightResult } from "./types";

export type RenderedInsight = {
  id: string;
  result: InsightResult;
};

/** Run registry computes + footnotes (shared by Astro SSG and tests). */
export function computeRenderedInsights(
  dataRoot = resolveInsightDataRoot(),
): RenderedInsight[] {
  const definitions = listInsights();
  const ctx = loadInsightContextFromFs(collectDataNeeds(definitions), dataRoot);
  const blocks: RenderedInsight[] = [];
  for (const definition of definitions) {
    const result = definition.compute(ctx, definition.defaultParams);
    if (result) {
      blocks.push({
        id: definition.id,
        result: applyFootnotesToInsightResult(definition.id, result),
      });
    }
  }
  return blocks;
}
