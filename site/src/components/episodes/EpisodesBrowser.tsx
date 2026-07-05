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
import { SearchFilter } from "../stats/filters/SearchFilter";
import { useEntryHighlight } from "./useEntryHighlight";
import { useEpisodesBrowserUiState } from "./useEpisodesBrowserUiState";

export function EpisodesBrowser() {
  const schemes = listEpisodeSchemes();
  const defaultScheme = defaultEpisodeScheme();
  const { schemeId, groupEnabled, setSchemeId, setGroupEnabled } =
    useEpisodesBrowserUiState(defaultScheme.id);
  const {
    clearHighlight,
    handleDimensionClick,
    handleSearchChange,
    highlight,
    searchQuery,
  } = useEntryHighlight();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<Awaited<
    ReturnType<typeof loadEpisodesBrowserData>
  > | null>(null);

  const scheme = getEpisodeScheme(schemeId) ?? defaultScheme;
  const usesSearchHighlight = scheme.highlightMode === "search";

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
      clearHighlight();
    },
    [clearHighlight, setSchemeId],
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

  const legendHighlight = useMemo(
    () =>
      usesSearchHighlight
        ? highlight
        : {
            ...highlight,
            source: highlight.source === "click" ? "click" : "none",
            searchQuery: "",
          } as typeof highlight,
    [highlight, usesSearchHighlight],
  );

  if (loading) {
    return <p className="text-sm text-text-muted">Loading…</p>;
  }

  if (error || !payload) {
    return (
      <p className="rounded-lg border border-danger-border bg-danger-surface px-4 py-3 text-sm text-danger-text">
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

      {usesSearchHighlight ? (
        <SearchFilter value={searchQuery} onChange={handleSearchChange} />
      ) : (
        <EpisodeLegend
          items={legendItems}
          colorMap={schemeContext.colorMap}
          missingColor={schemeContext.missingColor}
          legendItemGlyph={(item) => scheme.legendItemGlyph(item, schemeContext)}
          legendItemAriaLabel={scheme.legendItemAriaLabel}
          highlight={legendHighlight}
          onDimensionClick={handleDimensionClick}
        />
      )}

      <EpisodeEntryGrid
        episodes={payload.browser.episodes}
        scheme={scheme}
        schemeContext={schemeContext}
        groupEnabled={groupEnabled}
        episodeGap
        highlight={usesSearchHighlight ? highlight : legendHighlight}
        onDimensionClick={handleDimensionClick}
      />
    </div>
  );
}
