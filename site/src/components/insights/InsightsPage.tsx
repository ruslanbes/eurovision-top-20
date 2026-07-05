import { useEffect, useMemo, useState } from "react";
import { collectDataNeeds, loadInsightContext } from "./context";
import { InsightBlock } from "./blocks/InsightBlock";
import { listInsights, listInsightsBySection } from "./registry";
import { INSIGHT_SECTION_LABEL, type InsightContext, type InsightResult } from "./types";

type RenderedInsight = {
  id: string;
  result: InsightResult;
};

export function InsightsPage() {
  const [ctx, setCtx] = useState<InsightContext | null>(null);
  const [error, setError] = useState<string | null>(null);

  const definitions = useMemo(() => listInsights(), []);

  useEffect(() => {
    let cancelled = false;

    loadInsightContext(collectDataNeeds(definitions))
      .then((loaded) => {
        if (!cancelled) {
          setCtx(loaded);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load insight data");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [definitions]);

  const rendered = useMemo<RenderedInsight[]>(() => {
    if (!ctx) {
      return [];
    }

    const blocks: RenderedInsight[] = [];
    for (const definition of definitions) {
      const result = definition.compute(ctx, definition.defaultParams);
      if (result) {
        blocks.push({ id: definition.id, result });
      }
    }
    return blocks;
  }, [ctx, definitions]);

  const sections = useMemo(() => {
    const renderedById = new Map(rendered.map((item) => [item.id, item]));
    return listInsightsBySection()
      .map(([section, sectionDefinitions]) => ({
        section,
        label: INSIGHT_SECTION_LABEL[section],
        blocks: sectionDefinitions
          .map((definition) => renderedById.get(definition.id))
          .filter((item): item is RenderedInsight => item !== undefined),
      }))
      .filter((section) => section.blocks.length > 0);
  }, [rendered]);

  if (error) {
    return (
      <p className="rounded-lg border border-danger-border bg-danger-surface px-4 py-3 text-sm text-danger-text">
        {error}
      </p>
    );
  }

  if (!ctx) {
    return <p className="text-sm text-text-muted">Loading…</p>;
  }

  if (sections.length === 0) {
    return (
      <p className="text-sm text-text-muted">No insights matched the current data and thresholds.</p>
    );
  }

  return (
    <div className="space-y-10">
      {sections.map((section) => (
        <section key={section.section} aria-labelledby={`insights-${section.section}`}>
          <h2
            id={`insights-${section.section}`}
            className="mb-4 text-xl font-semibold text-text"
          >
            {section.label}
          </h2>
          <div className="space-y-4">
            {section.blocks.map((block) => (
              <InsightBlock key={block.id} result={block.result} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
