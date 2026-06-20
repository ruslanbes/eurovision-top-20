# stats-global-filter-state

Persist **episode range** and **filter selections** across `/` (videos) and `/songs/` navigation. Shared filters stay in sync; grain-specific filters are retained but not applied on the other page.

Parent: `stats-table-filters`  
Depends on: shipped filter framework + `PeriodControls` ([`stats-table-filters.md`](stats-table-filters.md))  
Related: [`site/README.md`](../../site/README.md), [`performance-category.md`](performance-category.md)

**Status:** Approved — implement when scheduled

---

## Problem

Today each page mounts its own `StatsExplorer` island with local React state:

- Filters reset to empty on every navigation (`useState<FilterState>({})`).
- Episode range resets to full corpus after load (`setBegin(first)`, `setEnd(last)` in `useEffect`).
- Video-only **Category** toggles are lost when visiting songs and coming back.

Users expect cross-page continuity: pick Sweden + 2024 + a narrowed window on videos, switch to songs with the same constraints, return to videos with Category still set.

[`stats-table-filters.md`](stats-table-filters.md) explicitly deferred URL persistence in v1 — this task delivers it.

---

## Goals

| Goal | Notes |
|------|-------|
| **Shared state** | Country, year, ESC winner, and episode range apply on both grains |
| **Preserved grain-specific state** | Video-only filters stay in the global store but are ignored (and hidden) on the song page |
| **Shareable URLs** | Query params encode state so links are bookmarkable |
| **No regression** | Filter algebra unchanged (AND across filters, OR within) |

---

## State model

Two layers — **not** one flat “filter list”:

```text
StatsUiState
├── window: { begin, end }     ← episode-month range (not a FilterDefinition)
└── filters: FilterState       ← keyed by filter id → selected values[]
```

### Scopes

Tag each filter id with a **scope** in a central registry (extend `defs.ts` or sibling `filterRegistry.ts`):

| Scope | Filter ids (today) | On video page | On song page |
|-------|-------------------|---------------|--------------|
| **shared** | `country`, `year`, `esc_winner` | show + apply | show + apply |
| **video** | `performance_category` | show + apply | hide; **keep in store** |
| **song** | _(none yet)_ | hide; keep in store | show + apply |

**Apply rule:** `applyFilters` receives only defs for the current grain (`filterDefsForGrain`), but **serialization** reads/writes the full `FilterState` object. Song page never drops `performance_category` keys when updating shared filters.

Future song-only filters (e.g. roll-up warnings) add a `song` scope entry without changing the storage shape.

### Episode window (special case)

The dual-thumb range slider is **not** a filter:

- Lives in `StatsUiState.window`, not `FilterState`.
- Uses the same `periods` array on both pages (from `video-hits.json` / copy script).
- Same validation: `begin` and `end` must be labels in `periods`; `beginIndex ≤ endIndex`.
- Changing range still recomputes window rows, then applies filters (existing behavior).

Default when params absent: full corpus (`periods[0]` … `periods[last]`) — same as today.

---

## URL contract (source of truth)

The **query string is the only persistence layer** for v1 — no `sessionStorage` / `localStorage` fallback. Full page loads between `/` and `/songs/` hydrate islands from `location.search`.

### Param names

Alphabetical in docs; order in URL does not matter.

| Param | Type | Example | Default if omitted |
|-------|------|---------|-------------------|
| `begin` | `YYYY-MM` | `begin=2020-01` | first period |
| `end` | `YYYY-MM` | `end=2024-12` | last period |
| `country` | comma-separated | `country=Sweden,Norway` | none |
| `year` | comma-separated ints | `year=2024,2023` | none |
| `esc_winner` | enum | `esc_winner=winners` | all (`null`) |
| `performance_category` | comma-separated | `performance_category=final_live,official_video` | none |

`esc_winner` values: `winners` | `not_winners` (map to existing `ESC_WINNER_*` constants). Omit param = All.

**Omit defaults** from the URL when possible (full range + no filters → bare path) to keep links short.

Example:

```text
/eurovision-top-20/?begin=2022-01&end=2024-12&country=Sweden&year=2024&performance_category=final_live
/eurovision-top-20/songs/?begin=2022-01&end=2024-12&country=Sweden&year=2024&performance_category=final_live
```

Song URL still carries `performance_category` even though the control is hidden — returning to videos restores the toggles.

### Parse / serialize

New module e.g. `site/src/components/stats/statsUiState.ts`:

- `parseStatsUiState(search: string, periods: string[]): StatsUiState`
- `serializeStatsUiState(state: StatsUiState, periods: string[]): string` → query string without leading `?`
- Unknown query keys → strip
- Invalid filter values → strip; keep valid siblings
- Invalid `begin`/`end` → clamp to nearest valid period or fall back to full range
- `begin` after `end` → swap indices

Unit-test parse/serialize round-trips and edge cases.

### URL updates

On user change (filter toggle, chip remove, range drag):

- Update in-memory state.
- **`history.replaceState`** with new query string (decided — do not use `pushState` for filter/range edits).
- **Debounce range** slider updates ~150–300 ms; discrete filter clicks update immediately.

Initial load: read URL **after** `periods` are known (post `loadQueryData`), then merge with defaults.

### Base path

Site deploys under Astro `BASE_URL` (e.g. `/eurovision-top-20/`). Serialization uses **query string only** (path-agnostic). Nav hrefs use `import.meta.env.BASE_URL` for path prefix + current `location.search` for state.

---

## Navigation

[`BaseLayout.astro`](../../site/src/layouts/BaseLayout.astro) nav links are static (`href={base}`, `href={base}songs/`) and **drop the query string today**.

**Fix:** client nav island (e.g. `StatsNav`) or inline script that sets `href` to `pathname + location.search`, or build links in a small React header shared by both pages.

Requirement: clicking **Videos** / **Songs** preserves current query params.

---

## Architecture sketch

```text
loadQueryData → periods[]
       ↓
parseStatsUiState(location.search, periods) → StatsUiState
       ↓
StatsExplorer state (window + filters)
       ↓
user edits → serialize → replaceState
       ↓
queryWindow(begin, end) → baseRows → applyFilters(filterState, filterDefsForGrain(grain))
```

Refactor `StatsExplorer.tsx`:

- Replace isolated `useState` for `begin`/`end`/`filterState` with `useStatsUiState(periods)` hook (or prop from a thin wrapper).
- Handlers call `setUiState(partial)` which updates URL + React state together.

No pipeline or packaged data changes.

---

## UI behavior summary

| Control | Song page | Video page |
|---------|-----------|------------|
| Range slider | synced | synced |
| Country / Year / ESC winner | synced | synced |
| Category toggles | hidden; values preserved in URL/state | visible |

Chip row: unchanged for shared filters; Category remains `showChips: false`.

---

## Tests

| Layer | What |
|-------|------|
| `statsUiState.test.ts` | Parse/serialize; invalid period; comma lists; `esc_winner`; round-trip; omit defaults; strip invalid keys/values |
| `statsUiState.test.ts` | **Required:** navigation simulation — parse URL → mutate shared filter (e.g. add country) → serialize → parse again; assert `performance_category` (and other grain-specific keys) unchanged |
| Manual checklist | See done_when |

`applyFilters.test.ts` — no change required unless grain-scoping tests prove useful.

---

## Documentation

- `site/README.md` — document query params and cross-page behavior
- One-line note in `stats-table-filters.md` follow-ups → this task

---

## Decisions

| Topic | Decision |
|-------|----------|
| Persistence | **URL only** for v1 — no `sessionStorage` / `localStorage` |
| History API | **`replaceState`** on filter and range edits |
| Base path | Query string is path-agnostic; nav uses Astro `BASE_URL` + preserved `search` |
| Table sort | **Out of scope** — remains local per page; follow-up task later |

---

## Done when

- [ ] Shared filters + range survive `/` ↔ `/songs/` navigation
- [ ] Video Category selection survives a round-trip through the song page (via URL)
- [ ] Query params reflect active state; bare URL = full range, no filters
- [ ] Nav links preserve query string (with correct `BASE_URL` prefix)
- [ ] `statsUiState` unit tests green, including navigation round-trip test; `npm test` + build green
- [ ] `site/README.md` updated

## Out of scope

- Server-side rendering of filtered tables
- **Table sort persistence** (separate task later)
- `sessionStorage` / `localStorage` fallback
- New filter types
- `facets.json` or pipeline changes
