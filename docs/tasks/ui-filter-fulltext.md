# ui-filter-fulltext

Free-text search filter on stats tables — substring match on the row label, case- and diacritic-insensitive, one query, filter-as-you-type.

Parent: shipped 0.2.0 filter/table UI ([`CHANGELOG.md`](../CHANGELOG.md#020---2026-06-21))  
Depends on: filter framework (`FilterBar`, `applyFilters`, `statsUiState`, URL persistence)  
Related: [`site/README.md`](../../site/README.md), [ADR-002](../adr/adr-002-site-visualization.md)

**Status:** Ready

---

## Problem

Users cannot quickly narrow a long stats table to rows whose title contains a phrase they remember (artist fragment, song words, country name in title, etc.). Country/year/ESC/category filters are structured — they do not replace “type something I remember.”

---

## Goal

Add a **Search** text field on `/` and `/songs/` that filters window rows by substring match on the row’s primary label:

| Grain | Haystack |
|-------|----------|
| **video** | `video_title` |
| **song** | `` `${artist} — ${song}` `` (same em dash as the Song column) |

Matching rules:

- **Substring** anywhere in the haystack.
- **Case insensitive.**
- **Diacritic / umlaut insensitive** — compare on a normalized form so e.g. query `dum tek tek` matches *Düm Tek Tek* (Hadise, ESC 2009).
- **Single query only** — one string; no comma-separated OR list (unlike country/year).
- **Filter on typing** — table updates as the user types; URL sync debounced (same ~200 ms as episode range).
- **Empty / whitespace-only** — filter inactive (same as other filters with no selection).

Filter algebra unchanged: **AND** with every other active filter; OR semantics inside this filter do not apply (only one value).

---

## Fit with current architecture

### Data layers (ADR-003)

| Layer | Role |
|-------|------|
| **raw / processed / packaged** | Unchanged |
| **site** | Client-side match on window-aggregated rows (`queryWindow` output) — no new packaged field |

Same pattern as country/year/ESC/fire: read label fields already on `VideoStatsRow` / `SongStatsRow`.

### Filter framework

```text
FilterBar → FilterState.search (single string)
       ↓
applyFilters (AND with other defs)
       ↓
StatsTable rows
       ↓
statsUiState → URL ?q=…
```

Register in `filterDefsForGrain` with scope **shared** (`/` and `/songs/`).

---

## Matching implementation

### Normalization helper

Shared pure function (e.g. `site/src/components/stats/filters/normalizeSearchText.ts`):

```ts
// Pseudocode
function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("en");
}
```

Apply to **both** haystack and query before `includes()`.

Unit tests (Vitest) must cover at least:

| Query | Haystack | Match |
|-------|----------|-------|
| `dum tek tek` | `Hadise — Düm Tek Tek` | yes |
| `FUeGO` | `Eleni Foureira - Fuego (LIVE) \| …` | yes |
| `  españa  ` | `…` (trimmed query) | per trim rules |
| `` | any | inactive (no filter) |

Use `\p{M}` (Unicode combining marks) — no hand-maintained transliteration table in v1.

### Filter definition

| Property | Value |
|----------|-------|
| `id` | `search` |
| `type` | `text` (new `FilterType`) |
| `label` | `Search` |
| `showChips` | `false` — query lives in the input; optional clear control inside the field |
| `match` | normalized haystack includes normalized query |

Haystack builders:

- **Video:** `row.video_title ?? ""`
- **Song:** `` `${row.artist} — ${row.song}` ``

Do **not** search country, flag, or metadata-only fields in v1.

---

## UI

- Text `<input>` in `FilterBar` (new `TextFilter` or inline branch for `type: "text"`).
- `placeholder` e.g. “Search titles…”
- Controlled value from `FilterState.search?.[0]` (store as one-element array for `FilterState` compatibility, or extend `FilterState` with a dedicated string field — prefer **one string in state** if it simplifies URL parse/serialize; document choice in implement).
- **On change:** update filter state immediately (table refilters); **debounce URL** write (~200 ms, reuse range debounce pattern in `useStatsUiState`).
- **Clear:** empty input removes filter.
- Disabled when table loading / no periods (same as other filters).

Accessibility: `<label>` or `aria-label="Search titles"`, associate input with label.

---

## URL persistence

| Param | Example | Notes |
|-------|---------|-------|
| `q` | `q=dum+tek+tek` | Omitted when empty; **not** comma-separated |

Add `q` to `STATS_URL_PARAMS`, `parseStatsUiState`, `serializeStatsUiState`. Round-trip tests in `statsUiState.test.ts` (navigation `/` ↔ `/songs/` preserves `q` like other shared filters).

Trim on parse; reject or ignore values that are empty after trim.

---

## Site touchpoints

| Area | Change |
|------|--------|
| `filters/types.ts` | Add `FilterType` `"text"`; extend `FilterableRow` if needed (video title / artist+song accessors via generic row in match) |
| `filters/normalizeSearchText.ts` | Normalization + `textMatchesQuery(haystack, query)` |
| `filters/defs.ts` | `SEARCH_DEF`; `FILTER_SCOPES.search = "shared"` |
| `filters/FilterBar.tsx` | Render text input; wire `onSetExclusive` or dedicated `onSearchChange` |
| `filters/applyFilters.test.ts` | Search + country AND; diacritic case; empty query |
| `statsUiState.ts` / `.test.ts` | Parse/serialize `q` |
| `useStatsUiState.ts` | Debounced URL for search updates |
| `StatsExplorer.tsx` | Pass search handler if not covered by existing filter callbacks |
| `site/README.md` | Document `q` param |

No pipeline or packaged JSON changes.

---

## Decisions

| Topic | Decision |
|-------|----------|
| Scope | `/` and `/songs/` (shared) |
| Match target | Video: `video_title`; song: `` `artist — song` `` |
| Algorithm | Substring, case-insensitive, NFD + strip marks |
| Cardinality | One query string; no OR |
| UX | Filter on typing; debounced URL |
| Algebra | AND with all other filters |
| URL param | `q` |
| Packaged data | None |

---

## Open questions

_None blocking v1._

Optional later:

- Also search parsed `artist` / `song` separately on video rows when title parse succeeded.
- Highlight matching substring in table cells.
- Minimum query length before filtering (e.g. 2 chars) — not in v1 unless perf requires it.

---

## Done when

- [x] `normalizeSearchText` + Vitest cases (diacritics, case, trim)
- [x] `search` filter def; `applyFilters` AND with other filters; empty query inactive
- [x] Search input on `/` and `/songs/`; table updates on typing
- [x] URL `q=` parse/serialize; debounced `replaceState`; survives `/` ↔ `/songs/` navigation
- [x] `npm test` + `npm run build` green
- [x] `site/README.md` documents `q` param

## Out of scope (v1)

- Multi-term OR / quoted phrases / regex
- Fuzzy / Levenshtein match
- Server-side or packaged full-text index
- Searching lyrics or non-title metadata
- Pipeline changes
