# ui-sort-url-persist

Persist table sort in the URL and keep it when navigating between `/` (videos) and `/songs/`.

Parent: shipped filter + URL UI ([`CHANGELOG.md`](../CHANGELOG.md#020---2026-06-21), [`ui-filter-fulltext`](ui-filter-fulltext.md))  
Depends on: `statsUiState`, `useStatsUiState`, `StatsNav`, `StatsExplorer`, `sort.ts`  
Related: [`site/README.md`](../../site/README.md), [`chart_points.md`](../faq/chart_points.md#default-sort)

**Status:** Done

---

## Problem

Filters and episode range already persist in the query string and survive `/` ↔ `/songs/` navigation (`StatsNav` copies `window.location.search`). **Sort does not** — it lives in local React state (`StatsExplorer`), so switching Videos ↔ Songs resets column order to the default.

Users who sort by Year, Country, ESC Place, etc. lose that choice on navigation.

---

## Goal

1. **URL-backed sort** — primary user-chosen column + direction in the query string.
2. **Shared vocabulary** — same param names on both pages for columns that exist on both grains.
3. **Cross-page carry** — `?sort=…` survives Videos ↔ Songs links (same mechanism as filters).
4. **`title` alias** — one URL term for the grain-specific label column:
   - **video** → sort by `video_title`
   - **song** → sort by `` `${artist} — ${song}` `` (today’s `song_label` comparator)

When the user sorted by `title` on videos and opens Songs, the song table opens sorted by the Song column (and vice versa).

---

## Current behavior (baseline)

| Piece | Today |
|-------|--------|
| User sort state | `useState<SortingState>` in `StatsExplorer` |
| Default display sort | `DEFAULT_TABLE_SORT` = `[{ id: "chart_points", desc: true }]` |
| Rank / tie-break sort | `DEFAULT_VIDEO_SORT` / `DEFAULT_SONG_SORT` (multi-column) used only for `#` ranks via `buildOriginalRanks` |
| Range change | Resets display sort to default unless `userSorted` |
| URL | No sort params; unknown `sort=` keys ignored by filter parser |

### Column inventory

| URL / shared id | Video internal | Song internal | Sortable |
|-----------------|----------------|---------------|----------|
| `title` | `video_title` | `song_label` | yes |
| `chart_points` | `chart_points` | `chart_points` | yes |
| `top1` … `top20` | same | same | yes |
| `esc_final_place` | same | same | yes |
| `country` | same | same | yes |
| `year` | same | same | yes |
| `flag` | same | same | **no** (keep out of URL vocab) |
| `rank` | `#` column | `#` column | **no** (derived) |

Video-only columns (`performance_category` is filter-only, not a table column) need no URL sort id.

---

## URL design

### Params

| Param | Example | Meaning |
|-------|---------|---------|
| `sort` | `sort=year` | Primary sort column (shared id; see table above) |
| `order` | `order=asc` | `asc` or `desc`; omit with `sort` → treat as `desc` for numeric stats columns, `asc` for `title` / `country` / `esc_final_place` **or** always require explicit `order` when `sort` is set — **pick one rule and test it** |

**Recommendation (v1):** require `order` whenever `sort` is present (`sort=year&order=asc`). Omitted both → default sort (`chart_points` desc). Simpler parse rules, no column-specific default direction in the serializer.

**Decision:** `order` required whenever `sort` is set. Internal title column id renamed to `title` on both grains (matches URL).

### Defaults

- No `sort` / `order` → `DEFAULT_TABLE_SORT` (`chart_points` desc) — same as today.
- Serialize **omit** when sort matches default (keeps bare URLs clean).

### Invalid values

- Unknown `sort` id → ignore sort params; use default.
- `sort=flag` or `sort=rank` → ignore; use default.
- `order` not `asc`/`desc` → ignore `order`; if `sort` valid, fall back to `desc` (or ignore entire sort — document choice).

---

## Grain mapping (`title`)

Introduce a small shared module (e.g. `sortUrl.ts`):

```ts
// Pseudocode
const SHARED_SORT_COLUMNS = new Set([
  "chart_points", "top1", "top3", "top5", "top10", "top20",
  "esc_final_place", "country", "year", "title",
]);

function urlSortToColumnId(urlId: string, grain: StatsGrain): string | null;
function columnIdToUrlSort(columnId: string, grain: StatsGrain): string | null;
```

Mapping:

- URL `title` → `video_title` (video) or `song_label` (song)
- Internal `video_title` / `song_label` → URL `title`

Optional follow-up: rename TanStack column `id` to `title` on both grains so internal and URL ids align — **not required for v1** if mapping layer is thin.

---

## Fit with current architecture

```text
StatsTable header click
       ↓
StatsExplorer onSortingChange
       ↓
statsUiState.sort  →  ?sort=&order=
       ↓
parse on load / STATS_URL_CHANGE_EVENT / popstate
       ↓
StatsTable sorting state
```

Extend `StatsUiState`:

```ts
type StatsUiState = {
  window: { begin: string; end: string };
  filters: FilterState;
  sort: { column: string; desc: boolean } | null; // null = default
};
```

Wire through `useStatsUiState` (immediate URL write on sort change — no debounce).

`StatsNav` already appends full `search` — no change required once sort is in the serialized query.

### Interaction with range change

Today: changing episode range resets sort unless the user has sorted.

**Keep that rule:** range change clears custom sort (and drops `sort`/`order` from URL) **only when** the user had not explicitly chosen a sort; if sort came from URL or a header click, retain it across range changes.

Clarify in implementation: `userSorted` flag vs URL-hydrated sort — hydrating from URL should count as user sort for this purpose.

### Original ranks (`#` column)

Unchanged: `buildOriginalRanks` continues to use `DEFAULT_VIDEO_SORT` / `DEFAULT_SONG_SORT` full tie-break chain on the **unfiltered** `baseRows`, independent of the user’s display sort.

---

## UI behavior

- Header click cycles sort asc/desc per TanStack (unchanged).
- Only **one** primary sort column is reflected in the URL (matches current single-column `DEFAULT_TABLE_SORT` display).
- Multi-column tie-breakers in `DEFAULT_*_SORT` stay internal — **not** serialized.

---

## Files (expected touch)

| Area | Files |
|------|--------|
| URL parse/serialize | `statsUiState.ts`, `statsUiState.test.ts` |
| Sort id mapping | new `sortUrl.ts` + tests |
| Hook | `useStatsUiState.ts` — `sort`, `setSort` |
| Explorer | `StatsExplorer.tsx` — hydrate sort from hook, drop isolated `useState` |
| Compare | `sort.ts` — `compareByColumn` already handles `song_label` / `video_title`; ensure `title` alias routed before compare |
| Table | `StatsTable.tsx` — optional column id alignment |
| Docs | `site/README.md` |

No packaged / pipeline changes.

---

## Tests

| Case | Expect |
|------|--------|
| Parse `?sort=year&order=asc` | `sort: { column: "year", desc: false }` |
| Serialize default sort | omit `sort` and `order` |
| Round-trip | parse → serialize → parse stable |
| `sort=title` on video | maps to `video_title` sort |
| `sort=title` on song | maps to `song_label` sort |
| Unknown `sort=foo` | default sort |
| Navigation fixture | shared filters + `sort=country&order=asc` preserved when only pathname changes |
| `applyFilters` / table | no change to filter algebra |

---

## Done when

- [x] `sort` + `order` URL params parsed and serialized in `statsUiState`
- [x] `title` URL id maps correctly per grain (`video_title` / `song_label`)
- [x] Sort survives `/` ↔ `/songs/` navigation with filters and range
- [x] Header sort updates URL via `replaceState`
- [x] Default sort omits params; invalid params fall back safely
- [x] `npm test` + `npm run build` green
- [x] `site/README.md` documents sort params

---

## Out of scope (v1)

- Multi-column sort in URL (full `DEFAULT_*_SORT` chain)
- Sorting by `performance_category` (not a table column)
- Remembering sort in `localStorage` separately from URL
- Backwards compatibility for hypothetical old `sort=artist` URLs (already ignored)

---

## Open questions

_None blocking v1._

Optional later:

- Rename internal column ids to match URL ids (`title` everywhere).
- Default `order` per column when `order` omitted (shorter URLs).
