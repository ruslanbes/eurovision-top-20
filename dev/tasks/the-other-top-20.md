# The other Top 20

- **Task ID:** `the-other-top-20`
- **Status:** backlog

## Problem

Many songs rank often on the **Eurovision Song Contest YouTube Top 20** but did poorly at the contest itself — semi-final non-qualifiers (DNQ) or Grand Final songs that placed **21st or lower**. A ranked table of the “chart winners” in that bucket is easy to derive from packaged song stats and makes a clear contrast with ESC-winner insights.

## Goal

Add insight **The other Top 20**: song-grain table of the **top 20** songs by `chart_points` among ESC competing entries where `esc_final_place` is **`DNQ`** or a **numeric place ≥ 21**.

## Copy (approved)

| Field | Text |
|-------|------|
| **Title** | The other Top 20 |
| **Lead** | Songs with the most chart points among entries that did not qualify for the final or placed 21st or lower at Eurovision. |
| **Footnote** | Chart points measure YouTube Top 20 performance on the official channel, not ESC televote or jury results. DNQ and bottom-of-final placements are different contest outcomes. |

## Decisions

| # | Topic | Decision |
|---|--------|----------|
| 1 | Insight id | `the-other-top-20` |
| 2 | Section | `other` |
| 3 | Grain | **Song** — one row per `(artist, song, year)` from `songLatest` |
| 4 | Qualify | `esc_final_place === "DNQ"` **or** `typeof esc_final_place === "number" && esc_final_place >= 21` |
| 5 | Exclude | `country === "World"`, `esc_final_place` in `NON_ENTRY`, `null`, `PENDING` |
| 6 | Special codes | **Include** `DNQ` only from string codes; do **not** include `CANCELLED`, `WITHDRAWN`, `DQ` unless they appear with numeric places (they won’t match) |
| 7 | Sort | `chart_points` descending, then contest `year` descending, then artist + song |
| 8 | Limit | **20 rows** fixed (`maxItems: 20`) |
| 9 | Links | `songLinkFromSong` → canonical member YouTube URL |
| 10 | Table | Four columns: **Chart points** · **Year** · **ESC** · **Song** (new `tableKind`, see below) |
| 11 | ESC column | Use `formatEscFinalPlace` labels (`DNQ`, `21`, …) |
| 12 | `needs` | `songLatest`, `videoLatest` |

## Non-goals

- Video-grain roll-up.
- GF places 11–20 (mid-table finalists).
- NON_ENTRY clips (e.g. interval acts).
- Footnote rules in v1.
- URL param overrides.

## Alternative idea

**Beside top 20**: same filter for songs, but instead of getting top 20 we get the first cluster or clear leaders that match the criteria


## Corpus snapshot (2026-07, packaged `song-stats-latest`)

**48** songs qualify; table shows top **20**. Tie at cutoff: #20 and #21 both **5** chart points (include first 20 by sort tie-break).

### Full top 20

| # | Chart pts | Year | ESC | Song |
|---|----------:|-----:|----:|------|
| 1 | 101 | 2010 | 22 | Sunstroke Project & Olia Tira — Run Away |
| 2 | 56 | 2018 | 23 | Amaia y Alfred — Tu Canción |
| 3 | 49 | 2010 | DNQ | Kristina — Horehronie |
| 4 | 30 | 2025 | 24 | Melody — ESA DIVA |
| 5 | 29 | 2019 | 22 | Miki — La Venda |
| 6 | 26 | 2022 | DNQ | Ronela Hajati — Sekret |
| 7 | 16 | 2006 | DNQ | Luiz Ejlli — Zjarr E Ftohtë |
| 8 | 13 | 2017 | 25 | Levina — Perfect Life |
| 9 | 13 | 2022 | DNQ | LUM!X feat. Pia Maria — Halo |
| 10 | 13 | 2021 | DNQ | Albina — Tick-Tock |
| 11 | 12 | 2025 | 25 | VÆB — RÓA |
| 12 | 11 | 2024 | 22 | Nebulossa — ZORRA |
| 13 | 6 | 2017 | 26 | Manel Navarro — Do It For Your Lover |
| 14 | 6 | 2024 | DNQ | LUNA — The Tower |
| 15 | 6 | 2023 | 22 | Albina & Familja Kelmendi — Duje |
| 16 | 6 | 2018 | DNQ | Eye Cue — Lost And Found |
| 17 | 6 | 2018 | DNQ | Julia Samoylova — I Won’t Break |
| 18 | 6 | 2018 | DNQ | Sennek — A Matter Of Time |
| 19 | 6 | 2017 | DNQ | Valentina Monetta & Jimmie Wilson — Spirit Of The Night |
| 20 | 5 | 2023 | 21 | Joker Out — Carpe Diem |

### Shortened preview (top 8)

| Chart pts | Year | ESC | Song |
|----------:|-----:|----:|------|
| 101 | 2010 | 22 | Sunstroke Project & Olia Tira — Run Away |
| 56 | 2018 | 23 | Amaia y Alfred — Tu Canción |
| 49 | 2010 | DNQ | Kristina — Horehronie |
| 30 | 2025 | 24 | Melody — ESA DIVA |
| 29 | 2019 | 22 | Miki — La Venda |
| 26 | 2022 | DNQ | Ronela Hajati — Sekret |
| 16 | 2006 | DNQ | Luiz Ejlli — Zjarr E Ftohtë |
| 13 | 2017 | 25 | Levina — Perfect Life |

**Mix in top 20:** 10 DNQ · 10 GF 21+ · **Spain ×5** · years 2006–2025.

**Out of scope examples (for contrast):** Jessy Matador — Allez Ola Olé (GF **12**, 106 cp); Loreen — Tattoo (winner, 95 cp).

**Note:** Moldova **2010** *Run Away* = GF **22**; Moldova **2017** *Hey Mamma* = GF **3** (different songs — vendor data correct).

## Architecture

```
site/src/components/insights/insights/theOtherTop20.ts
  qualifiesOtherTop20(row)
  computeOtherTop20Rows(ctx) → InsightSongChartEscRow[]
  export const theOtherTop20: InsightDefinition

site/src/components/insights/types.ts
  InsightSongChartEscRow { id, chartPoints, contestYear, escFinalPlace, label, labelHref }
  InsightResult union → tableKind: "song_chart_esc"

site/src/components/insights/blocks/TableBlock.tsx
  SongChartEscTable — Chart points | Year | ESC | Song

site/src/components/insights/registry.ts
  append theOtherTop20 to INSIGHT_ORDER (suggest after postMayDebut or dominant leaders)
```

Reuse `formatEscFinalPlace` from `site/src/components/stats/escFinalPlace.ts`.

## Done when

- [ ] `the-other-top-20` registered; title + approved lead + footnote.
- [ ] Table shows exactly the four columns above; 20 rows on current packaged data matching snapshot order (top row: Run Away 101 cp).
- [ ] Qualifying filter: DNQ or numeric place ≥ 21; NON_ENTRY / World excluded.
- [ ] Song links open YouTube via `songLinkFromSong`.
- [ ] `compute` returns `null` if fewer than 1 qualifying row (should not happen on current corpus).
- [ ] Unit tests: filter matrix + sort tie-break; integration test against packaged JSON for row 1 and row count 20.
- [ ] `site/src/components/insights/README.md` — one line under insights list.
- [ ] `npm test` and `npm run build` pass.

## Test plan

- Unit: DNQ qualifies; 21 qualifies; 20 does not; NON_ENTRY excluded; sort order.
- Integration: packaged data → 20 rows; `Kristina`/`Run Away`/`Ronela` present; no `esc_final_place === 1` rows.

## References

- Song stats: `data/packaged/per-song/alltime/eurovision-top-20-song-stats-latest.json`
- Similar table pattern: `yearClassics.ts` (`count_label`), `postMayDebut.ts` (`label_episodes` + year)
- ESC labels: `docs/faq/esc_final_place.md`
