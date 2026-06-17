# eurovision-final-place

Add **ESC final placement** (e.g. 1st, 2nd, DNQ) as a column on site table rows — joined from an external Eurovision results dataset, not derived from Top 20 tier counts.

Parent: `package`  
Depends on: `title_parse` / `package` (contest year + country/artist for join keys)  
Related: [ADR-000](../adr/adr-000-tech-stack.md), [ADR-003](../adr/adr-003-data-layers.md), [`data/README.md`](../../data/README.md), [`chart_points.md`](../faq/chart_points.md), [`video-insights.md`](video-insights.md)

**Status:** Backlog — spec only; no pipeline or site implementation yet.

---

## Problem

`chart_points` and tier columns measure **Eurovision YouTube channel** chart performance. They are unrelated to how a song placed in the ESC **Grand Final** (or semi-finals). See [`chart_points.md`](../faq/chart_points.md).

Beta scope (formerly `requirements.md`): enrich table rows with **final place** from a public Eurovision stats repository so users can compare channel popularity vs contest result.

---

## Data source

[EurovisionAPI/dataset](https://github.com/EurovisionAPI/dataset) — pinned release (e.g. tag `2026.4`), vendored as a flattened join table. No live HTTP fetch in CI or `package`.

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

Annual (or post-contest) refresh: bump pinned tag → re-run flatten step locally → commit. Implementation may be a small pipeline script (TBD); not part of the first slice unless needed to produce the initial vendor files.

**Flatten script input:** EurovisionAPI `senior.json` from the pinned release, or per-year `contestants/` + `rounds/final.json` trees.

**`entries.json` row shape** (alphabetical keys):

| Field | Type | Notes |
|-------|------|-------|
| `artist` | string | Performer name from dataset |
| `contest_year` | int | ESC edition year |
| `country_code` | string | Dataset country id (e.g. `NL`, `GB`, `UA`) — join via `COUNTRY_ALIASES` / parser country |
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
| `DNQ` | Did not qualify for the grand final | Flatten: contestant in edition but **not** in `final.json`; SF eliminated, or never reached the final (incl. SF-only entries such as Julia Samoylova 2018, SF place 15) |
| `DQ` | Qualified for grand final but excluded / withdrew after qualifying | Flatten: in SF with a qualifying outcome but **absent** from `final.json` (e.g. **Joost Klein 2024** — SF place 2, not in final). Rare; explicit rules in flatten script |
| `CANCELLED` | Contest edition did not take place | Flatten: edition has entrants but **no** final round (e.g. **2020** competing entries — 41 entries, empty `final.json`) |
| `PENDING` | Contest year not yet decided | Flatten: `contest_year` is in the future relative to vendored data (e.g. **2026** entries before May 2026 final) |
| `NON_ENTRY` | Not a competing song entry | **Package:** interval acts, full-show live streams, and similar — see [Non-entry videos](#non-entry-videos) |

### Package / join outcomes (not in vendor file)

| Value | Meaning | When |
|-------|---------|------|
| `null` | Unknown for this video | Title not parsed; no matching vendor row; unmatched competing entry |

Do **not** use `null` in `entries.json` — every vendor row must have a numeric rank or special code. `NON_ENTRY` is set in **`package`** (not the vendor file).

### Non-entry videos

Single code for anything that is **not** a country’s competing song in that ESC edition:

| Corpus example | `youtube_video_id` | Notes |
|----------------|-------------------|-------|
| `Eurovision Song Contest 2017 - Grand Final - Live` | `ehH0_UXtQlY` | Full grand-final **live stream** (only such entry today) |
| `Switch Song (with Conchita Wurst, …) - Eurovision 2019` | `M1cjEuT_uvg` | **Interval-act**-style special |
| `Käärijä & Baby Lasagna - #eurodab - …` | `DGsL8hA-1rE` | **Interval-act** / promo mashup (Basel 2025) |

**Assignment (package, before vendor join):**

1. `data/metadata/manual-video-metadata.json` — optional `esc_final_place: "NON_ENTRY"` on an entry (preferred for one-offs).
2. Else if `performance_type` is `Special` and the row is listed in a small built-in allowlist (ids above) → `NON_ENTRY`.
3. Do not assign `NON_ENTRY` to ordinary competing songs that merely have a `Special` performance type by mistake.

Other non-competing clips (e.g. Europe Shine a Light group performances) → `NON_ENTRY` when listed in manual metadata; otherwise `null` until catalogued.

### Avoid

| Term | Use instead |
|------|-------------|
| `NQ` | `DNQ` |
| `0`, negative integers | numeric rank or `DNQ` / `null` |

### Flatten rules (v0)

For each contestant in a `contest_year`:

1. If listed in `final.json` `performances` → use numeric `place`.
2. Else if year is **cancelled** (no final performances, e.g. 2020) → `CANCELLED`.
3. Else if year is **after** the pinned dataset’s last completed final → `PENDING`.
4. Else if contestant in semi and **would have qualified** (per that year’s rules) but not in final → `DQ`.
5. Else → `DNQ`.

Semi-final rank alone is **not** exported to packaged rows in v1 (but see edge cases for semi-only YouTube videos).

---

## Edge cases (from corpus + EurovisionAPI)

Analysis date: 2026-06-17. Corpus: **334** videos on latest alltime packaged snapshot (all title-parsed).

### Join / identity

| Case | Scale | Handling |
|------|-------|----------|
| **Multiple videos per ESC entry** | **90** distinct `(year, country, artist, song)` keys with 2+ videos | Official MV, Grand Final LIVE, National Final, etc. — **same** `esc_final_place` on every matching video row |
| **Country name vs code** | 43 corpus countries | Map parser `country` → EurovisionAPI code via `COUNTRY_TO_FLAG` + aliases (`Türkiye`→`Turkey`→`TR`, `Czech Republic`→`Czechia`→`CZ`, `Bosnia & Herzegovina`→`BA`) |
| **Artist / song title drift** | Common | Fallback join on `(country_code, year, artist)` when song strings differ (`Queen Of Kings` vs `Queen of Kings`) |
| **No vendor row** | Rare after flatten | `esc_final_place: null` |

### Contest years in corpus

| Case | Scale | Handling |
|------|-------|----------|
| **2024–2025** | **120** videos with `year >= 2024` | EurovisionAPI covers current years |
| **2026** | **40** videos | `PENDING` until 2026 results in pinned release |
| **2020** | **17** videos | `CANCELLED` for all 2020 ESC entries |
| **Pre-2004** | **4** videos (1974, 1985, 1990, 2003) | Dataset covers 1956+; semi-era rules do not apply |

### Performance type (YouTube variant)

| `performance_type` | Count | Placement note |
|--------------------|-------|----------------|
| Grand Final (LIVE) / Grand Final | 133 | Numeric rank when finalist |
| Official Music Video / Official Video | 132 | Same entry as LIVE — same rank |
| National Final Performance | 46 | Same entry if same song (e.g. Alessandra 2023 NF + GF) — same rank |
| Semi-Final (LIVE) | 7 | Use **grand final** outcome: rank if finalist, `DNQ`/`DQ` if not (e.g. Joost Klein 2024 semi clip → `DQ`) |
| Special / Showcase | 9 | Competing-adjacent clips → vendor join or `null`; **interval acts**, **live stream**, and other catalogued non-entries → `NON_ENTRY` |

### Political / participation gaps

| Case | Notes |
|------|-------|
| **Russia** | 10 videos (2016–2021); banned from 2022+ — entries through 2021 still in dataset |
| **Belarus** | Not in current corpus | — |
| **Pre-qualified (Big 5 + host)** | In `final.json` but not in SF — normal numeric rank (6 such in 2025) |

### EurovisionAPI quirks

| Quirk | Impact |
|-------|--------|
| `disqualifieds` on `final.json` often **empty** | Do not rely on it; derive `DQ` from SF qualify + absent from final |
| SF `place` is 1–19, never null in performances | Use only for flatten heuristics, not packaged field in v1 |
| 2004–2007 “neither” counts in API tree | Legacy layout; flatten script should follow per-year `rounds/` files, not assume 2008+ structure |

### Song roll-up (packaged per-song)

When multiple videos merge into one song row: use the **same** `esc_final_place` if all members share one ESC entry; if members disagree (should not happen for same key), emit a packaging warning (see `unlikely-events-warnings` task).

---

## Layer

Per [ADR-003](../adr/adr-003-data-layers.md) / [`data/README.md`](../../data/README.md): **ESC final place lives in packaged**, not processed.

| Layer | `esc_final_place` |
|-------|-------------------|
| `processed/` | **No** — raw-derived tier stats only |
| `packaged/` | **Yes** — augmented table rows for the site |
| `external/` | **Yes** — vendored flattened `entries.json` (read-only input to `package`) |

Join runs in **`package`**, after title metadata parse.

---

## Join sketch (v0)

1. Parse each video row → `year`, `country`, `artist`, `song` via `title_parse` in `package`.
2. If row is a [non-entry video](#non-entry-videos) → `esc_final_place: "NON_ENTRY"`; stop.
3. Load `data/external/esc-results/entries.json`.
4. Match within `contest_year`:
   - Primary: `(country_code, normalized artist, normalized song)` — use same normalization ideas as song roll-up where practical.
   - Fallback: `(country_code, artist)` when song titles diverge (official vs live video titles).
5. Emit `esc_final_place` on packaged row (number or special code per [Placement dictionary](#placement-dictionary)).

**Open:** country name → `country_code` mapping (dataset uses codes; parser emits display names). Reuse/extend `COUNTRY_ALIASES` and add `COUNTRY_TO_CODE` for EurovisionAPI `countries.json`. Artist/song normalization thresholds.

Rows with no parse or no dataset match: `esc_final_place: null`. Competing entries with a vendor match get a number or flatten special code; non-entry catalog rows get `NON_ENTRY`.

---

## Site

- Sortable column on per-video table (and per-song table when Beta ships).
- Display: numeric ranks as `1`, `2`, …; special codes as labels (`DNQ`, `DQ`, `Cancelled`, `Pending`, `Non-entry`) — exact copy TBD.
- Distinct from `chart_points` — document in UI or column header.
- Sort order: numeric ascending (1 first), then special codes in dictionary order (`DNQ`, `DQ`, `CANCELLED`, `PENDING`, `NON_ENTRY`), `null` last.

---

## Out of scope

- Live HTTP scraping in pipeline or CI
- Re-aggregating tier counts by final place
- Jury/televote breakdowns
- Semi-final rank as its own column (SF place stays internal to flatten only in v1)

---

## Done when

- [ ] Pinned EurovisionAPI release in `data/external/esc-results/MANIFEST.json`; flattened `entries.json` committed
- [ ] Flatten script applies [placement dictionary](#placement-dictionary) (`DNQ`, `DQ`, `CANCELLED`, `PENDING`); package assigns `NON_ENTRY` for [non-entry videos](#non-entry-videos)
- [ ] Join implemented in `package`; `esc_final_place` on packaged video rows (song roll-up: TBD — max/min/n/a for merged groups)
- [ ] Tests: fixture rows match known contestants; unmatched rows get `null`
- [ ] `data/README.md` external section matches shipped paths
- [ ] Site column when a follow-on site task ships
