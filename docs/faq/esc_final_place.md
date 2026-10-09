# esc_final_place

## What it is

`esc_final_place` is the **Grand Final result** for a competing entry in its contest — the European Eurovision Song Contest or Eurovision Song Contest Asia (see [Region](#region-europe--asia)) — as a numeric rank (1 = winner) or a special code (`DNQ`, `DQ`, …).

It is **not** related to [`chart_points`](chart_points.md), which measures YouTube Top 20 chart performance.

Joined in **`package`** from vendored [EurovisionAPI/dataset](https://github.com/EurovisionAPI/dataset) (`data/external/esc-results/`) plus metadata overrides. Lives on **packaged** rows only — not in `processed/`. See [`data/README.md`](../../data/README.md) and [`data/metadata/README.md`](../../data/metadata/README.md).

Regenerate vendor data: [`commands.md`](commands.md) (`evtop20 vendor-esc flatten`).

## Placement dictionary

`esc_final_place` is either a **positive integer** (grand final position) or a **string special code**. Site sort/display: numeric ranks first (1 = winner), then special codes, then unknown (`null`).

### Numeric ranks

| Value | Meaning |
| ----- | ------- |
| `1` … `N` | Grand final position (1 = winner) |

### Special codes

| Code | Meaning |
| ---- | ------- |
| `DNQ` | Did not qualify for the grand final |
| `DQ` | Qualified but excluded / withdrew after qualifying |
| `CANCELLED` | Contest edition did not take place (e.g. 2020) |
| `PENDING` | Contest year not yet decided |
| `WITHDRAWN` | Official entry did not participate |
| `NON_ENTRY` | Not a competing song entry (interval acts, live streams, specials) |

### Package outcomes

| Value | Meaning |
| ----- | ------- |
| `null` | Unknown — title not parsed, no vendor match, or ambiguous join |

Do **not** use `null` in vendored `entries.json`. `NON_ENTRY` and other overrides come from `data/metadata/esc-placement-overrides.json` and `esc-join-overrides.json`.

## Region (`europe` / `asia`)

Every packaged video and song row has a `region`: `asia` for Eurovision Song Contest Asia entries, `europe` for everything else. A title containing `Eurovision Song Contest Asia` or `#EurovisionAsia` (case-insensitive) is `asia` — `pipeline/src/evtop20/region.py`.

The vendored results cover the European contest only. `asia` rows skip the vendor join and get `PENDING`; an entry in `esc-placement-overrides.json` still wins, so a real Asia place can be set without code changes.

Song stats check one competing song per `(region, year, country)`, so the same country and year may appear once in each region. A song whose videos span both regions fails `package`.

## Virtual `World` country

Non-national clips (interval acts, full-show streams) use **`World`** / `🌍` in manual metadata — display-only, not an ESC vendor country. Vendor join is skipped for `World`. See [`data/metadata/README.md`](../../data/metadata/README.md#virtual-world-country).

## Site

Videos and Songs tables: sortable **Contest Place** column (`site/src/components/stats/escFinalPlace.ts`), preceded by a **Region** column (`Europe` / `Asia`). Numeric ranks as `1`, `2`, …; codes as `DNQ`, `DQ`, `Cancelled`, `Pending`, `Non-entry`; `—` when unknown.

Default table sort uses `esc_final_place` ascending after tier counts and before contest year (see [`chart_points.md`](chart_points.md#default-sort)).
