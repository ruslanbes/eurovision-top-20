# eurovision-final-place

Add **ESC final placement** (e.g. 1st, 2nd, DNQ) as a column on site table rows — joined from an external Eurovision results dataset, not derived from Top 20 tier counts.

Parent: `package`  
Depends on: `title_parse` / `package` (contest year + country/artist for join keys)  
Related: [ADR-000](../adr/adr-000-tech-stack.md), [ADR-003](../adr/adr-003-data-layers.md), [`data/README.md`](../../data/README.md), [`chart_points.md`](../faq/chart_points.md), [`video-insights.md`](video-insights.md)

**Status:** Done (pipeline + per-video site column, 2026-06-17). Per-song site table remains future Beta.

---

## Problem

`chart_points` and tier columns measure **Eurovision YouTube channel** chart performance. They are unrelated to how a song placed in the ESC **Grand Final** (or semi-finals). See [`chart_points.md`](../faq/chart_points.md).

Beta scope (formerly `requirements.md`): enrich table rows with **final place** from a public Eurovision stats repository so users can compare channel popularity vs contest result.

---

## Data source

[EurovisionAPI/dataset](https://github.com/EurovisionAPI/dataset) — pinned release tag **`2026.4`**, vendored as a flattened join table. No live HTTP fetch in CI or `package`.

| | |
|--|--|
| **Coverage** | Senior ESC 1956 → present (includes 2024, 2025) |
| **Upstream** | [eschome.net](https://eschome.net/), [EurovisionWorld](https://eurovisionworld.com), Eurovision LOD, others (see their README) |
| **Format** | Per-year JSON: `data/senior/{year}/contestants/` + `rounds/final.json` (`place` per `contestantId`); releases also ship bundled `senior.json` |
| **License** | No SPDX file in repo — treat as unofficial fan-compiled data; cite source URL in manifest |

### Vendoring (required)

Pin a [EurovisionAPI release tag](https://github.com/EurovisionAPI/dataset/releases) and commit a **flattened join table** under `data/external/esc-results/` — **no network fetch in CI or `package`**.

```text
data/external/esc-results/
  MANIFEST.json      # source repo, release tag, flatten date, upstream credits
  entries.json       # flat join rows (see shape below)
```

Annual (or post-contest) refresh: bump pinned tag → re-run flatten locally → commit.

**Regenerate vendor files:**

```bash
cd pipeline
# one-time: clone the pinned release (repo root, not /path/to/…)
git clone --depth 1 --branch 2026.4 https://github.com/EurovisionAPI/dataset.git ~/EurovisionAPI-dataset
uv run evtop20 vendor-esc flatten --dataset-dir ~/EurovisionAPI-dataset --release-tag 2026.4
uv run evtop20 package
```

**Flatten script input:** EurovisionAPI per-year `contestants/` + `rounds/final.json` trees under `data/senior/`.

**`entries.json` row shape** (alphabetical keys):

| Field | Type | Notes |
|-------|------|-------|
| `artist` | string | Performer name from dataset |
| `contest_year` | int | ESC edition year |
| `country_code` | string | Dataset country id (e.g. `NL`, `GB`, `UA`) — join via `COUNTRY_TO_CODE` / parser country |
| `esc_final_place` | number \| string | Grand final rank **or** special code — see [Placement dictionary](#placement-dictionary) |
| `song` | string | Song title from dataset |

Optional later: `esc_sf_place` (int) in vendor for diagnostics; not shown on site in v1.

---

## Placement dictionary

`esc_final_place` is either a **positive integer** (grand final position) or a **string special code**. Sort/display: numeric ranks first (1 = winner), then special codes in the order below.

### Numeric ranks

| Value | Meaning | Source |
|-------|---------|--------|
| `1` … `N` | Grand final position (1 = winner) | EurovisionAPI `rounds/final.json` → `performances[].place` |

Observed range in modern contests: typically **1–27** (finalist count varies by year). Pre-2004 single-show finals can go higher (e.g. 26 entries in 2003).

### Special codes

| Code | Meaning | When to assign |
|------|---------|----------------|
| `DNQ` | Did not qualify for the grand final | Flatten: contestant in edition but **not** in `final.json`; SF eliminated, or never reached the final |
| `DQ` | Qualified for grand final but excluded / withdrew after qualifying | Flatten: **`DQ_ALLOWLIST` only** in v0 (see [Flatten rules](#flatten-rules-v0)) |
| `CANCELLED` | Contest edition did not take place | Flatten: edition has entrants but **no** final round (e.g. **2020**) |
| `PENDING` | Contest year not yet decided | Flatten when year > `last_completed_contest_year`; package also assigns when parsed `year` > manifest value |
| `WITHDRAWN` | Selected official entry did not participate | **Package:** `esc-placement-overrides.json` when vendor has no row (e.g. Russia 2017) |
| `NON_ENTRY` | Not a competing song entry | **Package:** `esc-placement-overrides.json` — interval acts, live streams, ESL specials |

### Package / join outcomes (not in vendor file)

| Value | Meaning | When |
|-------|---------|------|
| `null` | Unknown for this video | Title not parsed; no matching vendor row; ambiguous join; unmatched competing entry |

Do **not** use `null` in `entries.json` — every vendor row must have a numeric rank or special code. `NON_ENTRY` is set in **`package`** (not the vendor file).

### Non-entry videos

Single code for anything that is **not** a country’s competing song in that ESC edition:

| Corpus example | `youtube_video_id` | Notes |
|----------------|-------------------|-------|
| `Eurovision Song Contest 2017 - Grand Final - Live` | `ehH0_UXtQlY` | Full grand-final **live stream** (only such entry today) |
| `Switch Song (with Conchita Wurst, …) - Eurovision 2019` | `M1cjEuT_uvg` | **Interval-act**-style special |
| `Käärijä & Baby Lasagna - #eurodab - …` | `DGsL8hA-1rE` | **Interval-act** / promo mashup (Basel 2025) |

**Assignment (package, before vendor join):**

1. `esc-placement-overrides.json` — direct `youtube_video_id` → `esc_final_place` (`NON_ENTRY`, `WITHDRAWN`, …).
2. `esc-join-overrides.json` — `(youtube_video_id → contest_year + country_code)` when display artist/song cannot match vendor (see [`data/metadata/README.md`](../../data/metadata/README.md)).
3. Do not assign `NON_ENTRY` to ordinary competing songs that merely have a `Special` performance type by mistake.

Other non-competing clips (e.g. Europe Shine a Light group performances) → `NON_ENTRY` in `esc-placement-overrides.json`.

### Avoid

| Term | Use instead |
|------|-------------|
| `NQ` | `DNQ` |
| `0`, negative integers | numeric rank or `DNQ` / `null` |

### Flatten rules (v0)

For each contestant in a `contest_year`:

1. If listed in `final.json` `performances` → use numeric `place`.
2. Else if year has contestants but **no** final performances:
   - if `contest_year` > `last_completed_contest_year` → `PENDING`
   - else → `CANCELLED` (e.g. 2020)
3. Else if `(contest_year, country_code, normalized artist)` is in **`DQ_ALLOWLIST`** → `DQ`.
4. Else → `DNQ`.

**`DQ_ALLOWLIST` (v0):** explicit tuples only — no per-year qualification-rule engine yet.

| Year | Code | Artist |
|------|------|--------|
| 2024 | NL | Joost Klein |

Semi-final rank alone is **not** exported to packaged rows in v1.

---

## Join rules (v0)

1. Parse each video row → `year`, `country`, `artist`, `song` via `title_parse` in `package`.
2. If `youtube_video_id` is in `esc-placement-overrides.json` → use that `esc_final_place`; stop.
3. If `youtube_video_id` is in `esc-join-overrides.json` → vendor lookup for that edition; stop when found.
4. If parsed `year` > `MANIFEST.last_completed_contest_year` → `PENDING`; stop.
5. Load `data/external/esc-results/entries.json`.
6. Map parser `country` → `country_code` via `evtop20.esc_results.countries.country_to_code` (`COUNTRY_ALIASES` + EurovisionAPI name table).
7. **Primary match (exact):** `(contest_year, country_code, normalized artist, normalized song)` — artist normalization: casefold, `and`/`og`/`y`/`x`/`feat.`/`ft.` → `&`, sorted duet parts; song = strip/collapse/casefold.
8. **Fallback match (exact artist):** `(contest_year, country_code, normalized artist)` when **exactly one** vendor row matches.
9. **Fallback match (exact song):** `(contest_year, country_code, normalized song)` when **exactly one** vendor row matches — covers stage names (e.g. `Kristina` vs `Kristina Pelakova`).
10. **Ambiguous or no match** → `esc_final_place: null` + packaging warning.

No fuzzy matching in v0.

### Song roll-up (packaged per-song)

`esc_final_place` copied from the **canonical member** (highest chart_points). If members disagree → packaging warning (see `unlikely-events-warnings` task).

---

## Edge cases (from corpus + EurovisionAPI)

Analysis date: 2026-06-17. Corpus: **334** videos on latest alltime packaged snapshot (all title-parsed).

### Join / identity

| Case | Scale | Handling |
|------|-------|----------|
| **Multiple videos per ESC entry** | **90** distinct `(year, country, artist, song)` keys with 2+ videos | Official MV, Grand Final LIVE, National Final, etc. — **same** `esc_final_place` on every matching video row |
| **Country name vs code** | 43 corpus countries | `country_to_code()` via EurovisionAPI names + `COUNTRY_ALIASES` |
| **Artist / song title drift** | Common | Fallback join on `(country_code, year, artist)` when **one** vendor row; else `null` + warning |
| **No vendor row** | Rare after flatten | `esc-placement-overrides.json` or `null` |

### Contest years in corpus

| Case | Scale | Handling |
|------|-------|----------|
| **2024–2025** | **120** videos with `year >= 2024` | EurovisionAPI covers current years |
| **2026** | **40** videos | `PENDING` (year > last completed 2025) |
| **2020** | **17** videos | `CANCELLED` for all 2020 ESC entries |
| **Pre-2004** | **4** videos (1974, 1985, 1990, 2003) | Dataset covers 1956+; semi-era rules do not apply |

### Performance type (YouTube variant)

| `performance_type` | Count | Placement note |
|--------------------|-------|----------------|
| Grand Final (LIVE) / Grand Final | 133 | Numeric rank when finalist |
| Official Music Video / Official Video | 132 | Same entry as LIVE — same rank |
| National Final Performance | 46 | Same entry if same song — same rank |
| Semi-Final (LIVE) | 7 | Grand final outcome: rank if finalist, `DNQ`/`DQ` if not |
| Special / Showcase | 9 | Vendor join or `null`; catalogued non-entries → `NON_ENTRY` |

---

## Layer

Per [ADR-003](../adr/adr-003-data-layers.md) / [`data/README.md`](../../data/README.md): **ESC final place lives in packaged**, not processed.

| Layer | `esc_final_place` |
|-------|-------------------|
| `processed/` | **No** |
| `packaged/` | **Yes** |
| `external/` | **Yes** — vendored `entries.json` (read-only input to `package`) |

Join runs in **`package`**, after title metadata parse.

---

## Site

- Sortable **Place** column on per-video table (`esc_final_place` — ESC Grand Final result, not chart points).
- Display: numeric ranks as `1`, `2`, …; special codes as `DNQ`, `DQ`, `Cancelled`, `Pending`, `Non-entry`; `—` when unknown.
- Column header tooltip documents distinction from `chart_points`.
- Sort order: numeric ascending (1 first), then special codes (`DNQ`, `DQ`, `CANCELLED`, `PENDING`, `NON_ENTRY`), `null` last.

---

## Out of scope

- Live HTTP scraping in pipeline or CI
- Re-aggregating tier counts by final place
- Jury/televote breakdowns
- Semi-final rank as its own column
- Fuzzy / rapidfuzz vendor join (artist alias normalization is deterministic, not scored fuzzy)

---

## Done when

- [x] Pinned EurovisionAPI release in `data/external/esc-results/MANIFEST.json`; flattened `entries.json` committed (1795 entries, tag `2026.4`)
- [x] `evtop20 vendor-esc flatten` applies placement dictionary; package assigns `NON_ENTRY`
- [x] Join in `package`; `esc_final_place` on packaged video + song rows
- [x] Tests: fixture rows + corpus integration (Netta 2018 → 1, Joost 2024 → `DQ`, live stream → `NON_ENTRY`)
- [x] `data/README.md` external section matches shipped paths
- [x] Site Place column on per-video table (`StatsTable`, `site/src/components/stats/escFinalPlace.ts`)
- [ ] Per-song site table when Beta ships
