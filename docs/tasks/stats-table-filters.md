# stats-table-filters

Client-side filter framework for stats tables. v1: **country** (searchable combobox) and **year** (select). Extensible for toggles, sliders, packaged flags later.

Parent: `scaffold-project`  
Depends on: shipped `StatsExplorer` + `queryWindow` ([`site/README.md`](../../site/README.md))  
Related: [ADR-003](../adr/adr-003-data-layers.md), [`data/README.md`](../../data/README.md), [`ui-filter-fire-titles.md`](ui-filter-fire-titles.md)  
May promote to ADR when filter types and packaged contracts stabilize.

**Status:** Done

---

## Problem

Users need to narrow the windowed stats table by metadata (country, contest year) without re-running the pipeline. More filter types will follow; avoid one-off UI per filter.

**Assumption:** one table per page (`/` video, `/songs/` song). Shared framework; per-grain filter defs.

---

## Filter algebra

| Scope | Operator |
|-------|----------|
| Values **within one filter** (e.g. Sweden + Norway) | **OR** — row matches if any selected value matches |
| **Across filters** (e.g. country + year) | **AND** — row must satisfy every filter that has ≥1 selected value |
| Empty filter (no chips) | No constraint — passes all rows for that dimension |

Example: `country ∈ {Sweden, Norway}` **AND** `year ∈ {2024}` → Swedish or Norwegian rows with `year === 2024`.

---

## UX (v1)

```text
[Episode range slider …]

Country ▾   Year ▾                    ← filter controls (dropdown / combobox)
🇸🇪 Sweden ×  🇳🇴 Norway ×  2024 ×   ← active chips (× removes value, table refreshes)

{count} videos · window … · {filtered count} after filters
[table]
```

| Control | Behavior |
|---------|----------|
| **Country** | Combobox: scroll list or type to narrow (prefix / case-insensitive on country name). Option shows `flag` + `country`. Multi-select via repeated picks; already-selected values hidden or disabled in list. |
| **Year** | Plain `<select>` or listbox — no typeahead. Multi-select same chip pattern. |
| **Chips** | One chip per selected value; × clears that value only. Placed in a chip row between controls and table (or inline with controls). |
| **Count** | Row count reflects filtered set; window label unchanged. |

Filters apply to **already window-aggregated** rows. Changing episode range recomputes base rows, then re-applies filter state (values with zero matches → empty table, chips may remain).

---

## Data sources

### Available today (sufficient for v1)

| Source | Role |
|--------|------|
| `packaged/query/video-meta.json` | Static `country`, `flag`, `year` per video (joined into window rows via `queryWindow`) |
| `packaged/query/song-meta.json` | Same fields per song |
| `queryWindow.ts` output | Table rows after `[begin, end]` aggregation — **filter input** |

**v1 facet options:** derive distinct `(country, flag)` and `year` from **current window rows** (pre-filter). No new packaged artifact required.

### Optional later (not required for v1)

| Artifact | When needed |
|----------|-------------|
| `packaged/query/facets.json` (or per-grain) | Corpus-wide country/year lists **independent of period window** (e.g. show all countries even if zero hits in range) |
| Row boolean flags (e.g. `matches_fire_filter`) | [`ui-filter-fire-titles.md`](ui-filter-fire-titles.md) — precomputed in `package`, consumed as toggle filter |
| `performance_type`, `esc_final_place` enums | Future enum filters — values on meta rows today |

### Null / missing

Video rows may have `country` / `year` null (unparsed). v1: omit from facet lists; rows with null fail enum match when that filter is active.

---

## Architecture

```text
queryWindow(rows) → baseRows
       ↓
deriveOptions(baseRows, filterDefs) → dropdown options
       ↓
applyFilters(baseRows, filterState, filterDefs) → filteredRows → StatsTable
```

### Core types (sketch)

```ts
type FilterId = string;

type FilterState = Partial<Record<FilterId, readonly FilterValue[]>>;

interface FilterDefinition<TRow> {
  id: FilterId;
  type: "enum-searchable" | "enum" | "toggle" | "range"; // extend later
  label: string;
  getOptions: (rows: TRow[]) => FilterOption[];
  match: (row: TRow, selected: readonly FilterValue[]) => boolean;
}

function applyFilters<TRow>(
  rows: TRow[],
  state: FilterState,
  defs: FilterDefinition<TRow>[],
): TRow[];
```

- **`enum-searchable`** — country (`FilterOption`: `{ value: country, label, flag }`)
- **`enum`** — year (`value: number`)
- Future **`toggle`** — boolean row field or predicate
- Future **`range`** — numeric slider (e.g. chart_points min/max)

Registry per `StatsGrain`: `videoFilterDefs`, `songFilterDefs`.

### Suggested layout

```text
site/src/components/stats/filters/
  types.ts
  applyFilters.ts
  FilterBar.tsx          # chips + control slots
  CountryFilter.tsx      # combobox
  YearFilter.tsx
  defs.ts                # v1 definitions
```

Wire in `StatsExplorer.tsx` between `PeriodControls` and `StatsTable`. Filter state in React `useState`; no URL sync in v1.

---

## v1 filters

| id | type | Row field | match |
|----|------|-----------|-------|
| `country` | `enum-searchable` | `country` (+ display `flag`) | `row.country` ∈ selected |
| `year` | `enum` | `year` | `row.year` ∈ selected |

Sort order for options: country A→Z; year descending (recent first).

---

## Done when

- [x] `applyFilters` + `FilterDefinition` types; unit tests for AND/OR algebra
- [x] Country combobox (search + multi + chips) and year select (multi + chips)
- [x] Integrated on `/` and `/songs/`; row count updates; × removes chip
- [x] Window range change recomputes base rows; filter state preserved
- [x] Readable in light/dark (semantic tokens / `dark:`)
- [x] `npm run build` succeeds
- [x] `site/README.md` or FAQ note on client-side filter contract

## Out of scope (v1)

- Packaged `facets.json`
- Fire-title toggle ([`ui-filter-fire-titles.md`](ui-filter-fire-titles.md) — follow-up on same framework)
- Slider / checkbox filter types (stub `type` only)
- Server-side or pipeline recomputation

## Follow-ups

| Task | Notes |
|------|-------|
| [`stats-global-filter-state.md`](stats-global-filter-state.md) | **Done** — URL query params; cross-page sync |
| `ui-filter-fire-titles` | `type: toggle` on packaged `matches_fire_filter` |
| Future ADR | Freeze filter algebra + optional packaged facet contract |
