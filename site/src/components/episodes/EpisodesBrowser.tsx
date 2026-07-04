import { useCallback, useEffect, useMemo, useState } from "react";

import { loadEpisodesBrowserData } from "./data";
import { EpisodeEntryGrid } from "./EpisodeEntryGrid";
import { EpisodeLegend } from "./EpisodeLegend";
import { EpisodeSchemeControls } from "./EpisodeSchemeControls";
import { buildSchemeContext, chartMissingColor } from "./schemeContext";
import {
  defaultEpisodeScheme,
  getEpisodeScheme,
  listEpisodeSchemes,
} from "./schemes/registry";
import { useEntryFocus } from "./useEntryFocus";
import { useEpisodesBrowserUiState } from "./useEpisodesBrowserUiState";

export function EpisodesBrowser() {
  const schemes = listEpisodeSchemes();
  const defaultScheme = defaultEpisodeScheme();
  const { schemeId, groupEnabled, setSchemeId, setGroupEnabled } =
    useEpisodesBrowserUiState(defaultScheme.id);
  const { focusedDimension, handleDimensionClick, clearFocus } = useEntryFocus();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<Awaited<
    ReturnType<typeof loadEpisodesBrowserData>
  > | null>(null);

  const scheme = getEpisodeScheme(schemeId) ?? defaultScheme;

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      setError(null);
      try {
        const data = await loadEpisodesBrowserData();
        if (!cancelled) {
          setPayload(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load episode data");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSchemeChange = useCallback(
    (id: string) => {
      setSchemeId(id);
      clearFocus();
    },
    [clearFocus, setSchemeId],
  );

  const schemeContext = useMemo(() => {
    if (!payload) {
      return { colorMap: {}, missingColor: chartMissingColor() };
    }
    return buildSchemeContext(scheme.id, payload, chartMissingColor());
  }, [payload, scheme.id]);

  const legendItems = useMemo(() => {
    if (!payload) {
      return [];
    }
    return scheme.legendItems(payload.browser.episodes);
  }, [payload, scheme]);

  if (loading) {
    return <p className="text-sm text-text-muted">Loading…</p>;
  }

  if (error || !payload) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
        {error ?? "Episode data unavailable"}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-text-muted">
        Each row is one Top 20 episode. Each ● is one entry (rank 1 → 20).
      </p>

      <EpisodeSchemeControls
        schemes={schemes}
        schemeId={scheme.id}
        groupEnabled={groupEnabled}
        onSchemeChange={handleSchemeChange}
        onGroupChange={setGroupEnabled}
      />

      <EpisodeLegend
        items={legendItems}
        colorMap={schemeContext.colorMap}
        missingColor={schemeContext.missingColor}
        legendItemGlyph={(item) => scheme.legendItemGlyph(item, schemeContext)}
        legendItemAriaLabel={scheme.legendItemAriaLabel}
        focusedDimension={focusedDimension}
        onDimensionClick={handleDimensionClick}
      />

      <EpisodeEntryGrid
        episodes={payload.browser.episodes}
        scheme={scheme}
        schemeContext={schemeContext}
        groupEnabled={groupEnabled}
        episodeGap
        focusedDimension={focusedDimension}
        onDimensionClick={handleDimensionClick}
      />
    </div>
  );
}
