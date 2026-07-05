# Episodes browser

Rank 1–20 grid for `/episodes/`. Each row is one Top 20 episode month; each ● is one chart entry. **Color schemes** are plugins that encode entries by a dimension (country, contest year, …).

## Layout

| Path | Role |
|------|------|
| `types.ts` | `BrowserEntry`, `BrowserEpisode`, payload types |
| `data.ts` | Load packaged `browser.json` + `year-colors.json` |
| `schemes/types.ts` | `EpisodeScheme`, `EpisodeSchemeContext` |
| `schemes/registry.ts` | Ordered list of registered schemes |
| `schemes/*.ts` | One module per scheme |
| `schemeContext.ts` | Build per-scheme `colorMap` / `glyphMap` from payload |
| `EpisodesBrowser.tsx` | Load data, wire scheme + UI state, render grid |
| `EpisodeEntryGrid.tsx` | Rows of ● cells; optional Group reorder |
| `EpisodeLegend.tsx` | Clickable legend; shared with focus |
| `EpisodeSchemeControls.tsx` | Scheme picker + Group switch |
| `entryLayout.ts` | Rank order vs group sort |
| `entryFocus.ts` | Click-to-focus / dim other dimensions |
| `entryTooltip.ts` | Hover label for filled entries |
| `periodLabels.ts` | Month abbrev + year dividers between rows |
| `constants.ts` | Shared dimension ids and glyphs |

## Plugin registry

Each scheme implements `EpisodeScheme`:

| Field | Purpose |
|-------|---------|
| `id` | Stable kebab-case id (e.g. `country`) |
| `label` | Picker button text |
| `dimensionKey(entry)` | Stable string key for focus, grouping, and legend |
| `entryColor(entry, ctx)` | CSS color for the ● |
| `entryGlyph(entry)` | Character shown in the cell (flag emoji, ●, 🔥, …) |
| `groupSortKey(entry)` | Sort key when **Group** is on (ties broken by rank) |
| `legendItems(episodes)` | Unique dimension values across the timeline |
| `legendItemGlyph(item, ctx)` | Legend symbol for one item |
| `legendItemAriaLabel(item)` | Accessible legend label |

`schemes/registry.ts` holds `SCHEME_ORDER` — picker order and default (`country`). Export the scheme object from your module and append it there.

Register a matching branch in `buildSchemeContext()` (`schemeContext.ts`) when the scheme needs a non-empty `colorMap` or `glyphMap`.

## Scheme context

`EpisodeSchemeContext` is built once per active scheme from loaded payload:

| Field | Purpose |
|-------|---------|
| `colorMap` | Dimension key → CSS color |
| `missingColor` | Color for `{ missing: true }` slots |
| `glyphMap` | Optional dimension key → legend/cell glyph (country flags) |

`schemeContext.ts` also exports `chart*Color()` helpers that return `rgb(var(--chart-*))` so theme toggles apply without re-fetching data.

**Year scheme** is the exception: contest-year colors are fixed hex from `year-colors.json`, not theme tokens.

## Data

Site reads **packaged JSON only** ([ADR-003](../../../../docs/adr/adr-003-data-layers.md)).

| File | Loaded by | Role |
|------|-----------|------|
| `data/packaged/episodes/browser.json` | `data.ts` | Full episode timeline + enriched entries |
| `data/packaged/episodes/year-colors.json` | `data.ts` | Contest-year hex palette for the year scheme |

Payload shape and pipeline source: [`data/README.md`](../../../../data/README.md#episode-browser-packagedepisodes).

Filled entry fields are on `BrowserFilledEntry` in `types.ts`. Missing ranks are `{ missing: true, rank: N }`.

## Page behaviour

`EpisodesBrowser` loads payload, resolves the active scheme from UI state, builds context, and renders:

1. **Scheme controls** — segmented picker + **Group** switch
2. **Legend** — items from `legendItems`; click toggles focus on a dimension
3. **Entry grid** — one row per episode; cells use `entryColor` / `entryGlyph`

**Group:** when enabled, `layoutEpisodeEntries` reorders each row by `groupSortKey` instead of rank 1→20.

**Focus:** clicking a legend item or cell toggles highlight on one dimension; other entries dim (`entryFocus.ts`). Missing slots never receive focus. Changing scheme clears focus.

UI state (`schemeId`, `groupEnabled`) lives in `useEpisodesBrowserUiState` — not persisted to the URL yet.

## Adding a scheme

1. **Add a module** under `schemes/` — export dimension helpers and an `EpisodeScheme` object (see `countryScheme.ts` or `escWinnerScheme.ts`).

2. **Register** in `schemes/registry.ts` (`SCHEME_ORDER`).

3. **Context** — if the scheme needs colors or glyphs from payload, add a `build*SchemeContext` and wire it in `buildSchemeContext()`.

4. **Theme** — for theme-aware colors, add `--chart-<name>` in `src/styles/theme.css` and a helper in `schemeContext.ts`.

5. **Test** — Vitest beside the module (`schemes/*.test.ts`) and registry order if needed.

6. **Verify** — `npm test` and `npm run build` in `site/`.

### Checklist

- [ ] Unique `id` and picker `label`
- [ ] `dimensionKey` stable across episodes; use `constants.ts` for shared sentinel keys
- [ ] `legendItems` matches keys used in `dimensionKey`
- [ ] Missing entries use `MISSING_DIMENSION` / `ctx.missingColor`
- [ ] `groupSortKey` returns `GROUP_SORT_LAST` for entries that should sort last when grouped

## Out of scope (current)

- URL persistence for scheme / Group / focus
- Processed-layer episode artifact (packaged `browser.json` only)
- Insights-style compute blocks on this route
