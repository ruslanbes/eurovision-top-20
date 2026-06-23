# video-insights

Candidate **per-video** analytics and site copy — formal definitions only. Implementation deferred; capture ideas so we do not forget.

Parent: `generate-stats-table`  
Depends on: `chart_points` column (shipped), raw episodes, processed stats  
Grain: **video** (`video_title`) for most insights; `other-multi-version-songs` groups by song key (artist + song) — needs title parser (`[title_parse/](../../pipeline/src/evtop20/title_parse/)` in `package`).

## Site sections (v1)

Insights will be grouped on the static site under four headings:


| Site section            | Insight id                                                | Summary                                                                                                                                                                              |
| ----------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Year insights**       | `[year-classics](#year-classics)`                         | Old uploads (contest year C) still charting often                                                                                                                                    |
|                         | `[year-post-contest-legacy](#year-post-contest-legacy)`   | How year-C uploads perform after the next ESC (from June C+1)                                                                                                                        |
| **Country insights**    | `[country-presence-heatmap](#country-presence-heatmap)`   | Heatmap: country × episode month (chart presence)                                                                                                                                    |
| **ESC winner insights** | `[esc-april-pulse](#esc-april-pulse)`                     | Winner upload in April Y top 10?                                                                                                                                                     |
|                         | `[esc-may-crown](#esc-may-crown)`                         | Winner upload at rank 1 in May Y?                                                                                                                                                    |
| **Other**               | `[dominant-leaders](#dominant-leaders)`                   | Small GOAT cluster with huge `chart_points` gap                                                                                                                                      |
|                         | `[other-never-top1-leader](#other-never-top1-leader)`     | Best `chart_points` among uploads that never hit rank 1                                                                                                                              |
|                         | `[other-multi-version-songs](#other-multi-version-songs)` | Songs with multiple upload variants on the chart                                                                                                                                     |
|                         |                                                           | list of the most popular entries per county / year. Table of countries. for each country select the topmost entry. Same for year. Alternatively implement as a filter for the tables |


**Related (not in this task):** contest-year **season wave** charts and year heatmap live under `[contest-season-waves.md](contest-season-waves.md)` — same **Year insights** site tab as a viz sibling, not a separate numbered insight here.

## Shared inputs


| Source                                                                 | Use                                                                                                                                     |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Processed alltime latest                                               | Cumulative `chart_points`, tier counts — `[chart_points.md](../faq/chart_points.md)`, paths in `[data/README.md](../../data/README.md)` |
| `data/processed/alltime/eurovision-top-20-alltime-YYYY-MM.json`        | Stats as-of a month (optional)                                                                                                          |
| `data/raw/episodes/YYYY-MM.json`                                       | Single-episode ranks 1–20                                                                                                               |
| External ESC dataset                                                   | Contest winner / final place — `[esc_final_place.md](../faq/esc_final_place.md)`                                                        |
| `[title_parse/](../../pipeline/src/evtop20/title_parse/)` in `package` | Contest year, country, song key, winner matching                                                                                        |


---

## Year insights

Contest **edition year C** parsed from `video_title` (e.g. `#Eurovision2020`, “Eurovision 2020”). Shared parse rules with `[contest-season-waves.md](contest-season-waves.md)`.

### year-classics

**Question:** Which **old** uploads still show up in the monthly top 20 often?

**Age:** contest year **C** from title. Age at episode (Y, M):


\text{age}(Y, M) = Y - C


(Adjust if M < 4 and we care about “Eurovision year” vs calendar — TBD.)

**Classic (v0):**

- \text{age}(Y, M) \ge 10 at episode date.
- **Appearance rate** over a window of episodes \mathcal{E}:


r = \frac{ E \in \mathcal{E} : \text{video in top 20 in raw episode } E }{|\mathcal{E}|}


- **Classic** if r \ge p (suggested **p = 0.5**) and age ≥ 10 in at least half of \mathcal{E}.

**Window \mathcal{E} (pick one at implement time):**

- Last **12** episode months in corpus, or
- All episodes with `period >= (C + 10, 1)`.

**Output (future):** `video_title`, contest year C, age, r, episode count.

**Open later:** parse failures; LIVE vs Official as one “classic” entity (song stats); minimum |\mathcal{E}| (e.g. ≥ 6 episodes).

---

### year-post-contest-legacy

**Question:** After the **next** Eurovision is over, how well do uploads from contest year **C** still perform on the channel chart?

**Why wait until June C+1:** Eurovision **C+1** final is ~May C+1. June C+1 is the first episode month **after** that final — current-year hype for C+1 has peaked; year-**C** uploads are judged in “legacy” conditions, not during their own season.

**Measurement window:**


S_C = (C+1,\ 6) \qquad\text{(June of year } C+1\text{)}



\mathcal{W}_C =  E : \text{episode period}(E) \ge S_C 


Only episodes that exist in the corpus count (episode months only — no gap fill).

**Cohort:** V_C = all distinct `video_title` with contest year C.

**Per-year stats (one row per contest year C that has any V_C and any \mathcal{W}_C):**


| Metric                | Definition                                                                 |
| --------------------- | -------------------------------------------------------------------------- |
| `cohort_size`         | |V_C|                                                                      |
| `active_videos`       | v \in V_C : v \text{ appears in top 20 in some } E \in \mathcal{W}_C       |
| `top20_appearances`   | \sum_{v \in V_C} E \in \mathcal{W}_C : v \text{ rank} \le 20 \text{ in } E |
| `chart_points_gained` | \sum_{v \in V_C} \bigl( P_v^{\text{end}} - P_v^{\text{start}} \bigr)       |


Where:

- P_v^{\text{end}} = `chart_points` for v in the **latest** cumulative snapshot (or snapshot at end of \mathcal{W}_C).
- P_v^{\text{start}} = `chart_points` for v in the last cumulative snapshot with period **strictly before** S_C (if none, treat as 0).

Optional derived:


\text{activity_rate} = \frac{\text{active_videos}}{\text{cohort_size}}, \qquad
\text{avg_points_gained} = \frac{\text{chart_points_gained}}{\text{cohort_size}}


**Output (future):** table keyed by contest year C; optional leader row (video from V_C with largest points gained in window).

**Open later:** parse contest year from titles; years with no June C+1 episode yet (window empty); compare cohorts across C on one chart; song-grain roll-up.

---

## Country insights

### country-presence-heatmap

**Question:** How does each **participating country** show up on the Most Watched chart over episode months — same compact heatmap as contest-year waves (`[contest-season-waves.md](contest-season-waves.md)` §C), but **rows = country** instead of contest year C.

**Why country:** contest-year heatmaps answer “when did ESC 2024 dominate?”; country heatmaps answer “when did **Ukraine** / **Sweden** / **Italy** dominate?” — useful for diaspora interest, winner spikes, and long-running national catalogues.

**Country K** for a video: parsed from `video_title` via `[title_parse/](../../pipeline/src/evtop20/title_parse/)` in `package` — prefer human `**country`** name; fall back to flag emoji → country lookup if name missing. Unparsed titles → **unknown** bucket (optional separate row or excluded from heatmap).

**Building blocks** (same episode timeline as year heatmap in contest-season-waves):


| Building block             | Meaning                                                                    |
| -------------------------- | -------------------------------------------------------------------------- |
| **Country K**              | Participating country attached to the upload                               |
| **Presence in month M**    | Distinct `video_title` with country K appears in episode M (any rank ≤ 20) |
| **New entries in month M** | K-videos whose **first seen** in top 20 == M                               |


Episode months only — x-axis is **episode timeline**, not every calendar month (gaps honest).

**Per-country metrics (mirror contest-year wave metrics):**


| Metric                    | Definition                                           |
| ------------------------- | ---------------------------------------------------- |
| `presence_by_month[K, M]` | # of distinct K-videos in top 20 in episode M        |
| `new_by_month[K, M]`      | # of K-videos with `first_seen == M`                 |
| `peak_month[K]`           | Month with max `presence_by_month` for K             |
| `total_presence[K]`       | \sum_M \texttt{presencebymonth}[K, M] — row sort key |


**Heatmap (site viz — same encoding as year heatmap §C):**


| Axis        | Value                                                                                                     |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| **Rows**    | Country K (sort: `total_presence` desc, then name)                                                        |
| **Columns** | Episode month `YYYY-MM`                                                                                   |
| **Color**   | `presence_by_month` (default) or toggle `**new_by_month`**                                                |
| **Scale**   | Sequential theme tokens (`--chart-seq-low` → `--chart-seq-high`) per `[site-theming.md](site-theming.md)` |


**Procedure:**

1. Walk all raw episodes in period order.
2. For each entry with rank ≤ 20 and non-empty `video_title`, parse country K.
3. Update `presence_by_month` and track `first_seen` per `video_title`.
4. Emit matrix for site (or share `contest-season-waves.json` envelope with a `by_country` section).

**Output (future):** heatmap component + hover month → list top K-videos that month; optional filter (e.g. only `grand_final_live` uploads).

**Open later:** dual citizenship / artist country vs song country; “Rest of World” non-ESC uploads in titles; rank-weighted color (`chart_points` sum per K per month); compare side-by-side with contest-year heatmap tab; minimum parse rate before showing chart.

---

## ESC winner insights

Require external **winner** data per contest year Y (`[esc_final_place.md](../faq/esc_final_place.md)`). Winner → channel `video_title` matching rules TBD (any variant vs Official only).

### esc-april-pulse

**Question:** Did an upload for the **Eurovision winner of year Y** appear in the **April Y** Most Watched episode top 10?

**Why April:** episodes align with pre-contest season (`period.month == 4`, `period.year == Y`).

**Procedure (per contest year Y):**

1. Load raw episode `period = {year: Y, month: 4}` if it exists → else **unknown** (no episode).
2. Resolve **winner** for Y from external data (artist + song / country).
3. Match winner to one or more channel `video_title` rows (Official Video, LIVE, etc.) — matching rules TBD.
4. **Hit** if any matched upload has **rank ≤ 10** in that episode’s `entries`.
5. **Miss** if episode exists, winner known, match found, but best rank > 10.
6. **Unknown** if episode missing, winner missing, or no confident title match.

**Output (future):** table year × {hit | miss | unknown} + rank + matched `video_title`.

**Open later:** fuzzy match quality; count “any variant” vs “Official Video only”; compare with `[esc-may-crown](#esc-may-crown)`.

---

### esc-may-crown

**Question:** Was an upload for the **Eurovision winner of year Y** at **rank 1** in the **May Y** Most Watched episode?

**Why May:** Grand Final is in May; the May episode is the natural “right after the show” chart (`period.month == 5`, `period.year == Y`).

**Procedure (per contest year Y):**

1. Load raw episode `period = {year: Y, month: 5}` if it exists → else **unknown** (no episode).
2. Resolve **winner** for Y from external data (artist + song / country).
3. Match winner to one or more channel `video_title` rows — same rules as `[esc-april-pulse](#esc-april-pulse)`.
4. **Hit** if any matched upload has **rank == 1** in that episode’s `entries`.
5. **Miss** if episode exists, winner known, match found, but best rank ≠ 1 (include actual rank).
6. **Unknown** if episode missing, winner missing, or no confident title match.

**Output (future):** table year × {hit | miss | unknown} + rank + matched `video_title`.

**Open later:** LIVE vs Official Video; winner at #1 in **June Y** if May episode missing; pair with `[esc-april-pulse](#esc-april-pulse)` (April top 10 → May #1) as a season arc.

---

## Other

Insights that are not keyed by contest year, country, or ESC winner.

### dominant-leaders

**Question:** Which uploads sit in a small top group with a large gap to everyone else (“greatest of all time”)?

**v0 metric:** `chart_points` only (latest cumulative snapshot).

**Procedure:**

1. Take rows from `-latest`, sort by `chart_points` descending → P_1 \ge P_2 \ge \cdots.
2. Find the **smallest** rank k \ge 1 such that the relative gap below the cluster is large:


\frac{P_k - P_{k+1}}{P_k} \ge g


Use P_{k+1} = 0 if k = n (only one video). Suggested default: **g = 0.25** (25% drop after rank k).

1. **Leader cluster** = videos at ranks 1 \ldots k.
2. **Insight fires** when k \le 3 (small cluster) **and** P_k - P_{k+1} \ge m for an absolute floor **m** (e.g. 50 points) — avoids calling a gap “huge” on tiny totals.

**Output (future):** list of `video_title` + `chart_points` in cluster, gap to next, snapshot date.

**Open later:** tune g, m, k; use `-latest` vs a fixed season; show on site as badge or callout in this section.

---

### other-never-top1-leader

**Question:** Which upload has the **best chart performance** (`chart_points`) among those that **never reached rank 1** in any episode?

**Why:** Highlights strong “always a bridesmaid” hits — high cumulative tier weight without ever topping a monthly chart. Contrast with `[dominant-leaders](#dominant-leaders)` (includes #1 appearances).

**Score:** `chart_points` from `-latest` (`[chart_points.md](../faq/chart_points.md)` — not ESC final score).

**Procedure (v0 — video grain):**

1. Take rows from `eurovision-top-20-alltime-latest.json`.
2. **Eligible** iff `top1 == 0` (never rank 1 in any included episode).
3. Sort eligible by `chart_points` descending, then `top1` … `top20`, then `esc_final_place` ascending, then contest year descending, then `video_title` (same tie-break as default stats sort).
4. **Leader** = first row(s) after sort; report ties if `chart_points` equal.

**Optional metrics for context:** `top3`, `top10`, `top20` on the leader row; gap to next eligible row.

**Output (future):** highlight card or table row — `video_title`, `chart_points`, best tier reached (e.g. “best rank implied: top 3 only” from tier counts — TBD), snapshot date.

**Song grain (defer):** when song stats exist (packaged song stats (`data/packaged/per-song/`)), same rule on rolled-up rows: eligible if summed `top1 == 0`, leader by summed `chart_points` across variants.

**Open later:** minimum `chart_points` floor to avoid noise; list top 5 eligible not only #1. (Flexible period range shipped in 0.1.0.)

---

### other-multi-version-songs

**Question:** How many **songs** appear on the chart as **multiple uploads** (Official Video, LIVE, National Final, etc.)?

**Grain:** Grouped by **song key** (`artist` + `song` from `[title_parse/](../../pipeline/src/evtop20/title_parse/)` in `package`) — not raw `video_title`. One song can map to several video rows in stats.

**Corpus:** all rows in `eurovision-top-20-alltime-latest.json` (cumulative — any upload that ever contributed to tier counts).

**Procedure:**

1. For each stats row, parse `video_title` → song key (skip / warn if incomplete).
2. Group rows by song key; for each key, count **distinct** `video_title` values → **variant count** n.
3. Bucket songs:


| Bucket          | Condition |
| --------------- | --------- |
| **2 versions**  | n = 2     |
| **3 versions**  | n = 3     |
| **3+ versions** | n \ge 4   |


(Optional baseline: **1 version** = n = 1 — singles on chart with only one upload.)

1. Report **counts** per bucket and **share** of all parsed songs:


\text{share}_{\text{bucket}} = \frac{\text{songs in bucket}}{\text{all songs with } n \ge 2}


(or denominator = all songs including singles — pick at implement time).

**Output (future):** summary table + optional drill-down (song key → list of `video_title` + per-variant `chart_points`).

**Example interpretation:** “42 songs chart as exactly two uploads; 18 as three; 7 as four or more.”

**Open later:** depends on `title_parse`; parse failures excluded from denominator or listed separately; same breakdown per contest year C; site bar chart; song-stats table cross-check; `**official_lyric_video`** — count as own variant vs merge with Official Music Video (TBD).

---

## Not in scope (this doc)

- Implementation CLI, site widgets, or CI
- Song-grain versions of year / ESC winner insights (`other-multi-version-songs` is already song-key grouped)
- Eurovision **final place** column → `[esc_final_place.md](../faq/esc_final_place.md)`
- Contest-year **wave** viz (`[contest-season-waves.md](contest-season-waves.md)`) — separate task; shares **Year insights** site tab only

## Done when (future task)

- Each insight has a defined algorithm, stable **insight id**, site **section** assignment, tests on fixture episodes, and optional site/export surface
- Thresholds (g, m, p) documented or configurable

