# esc_final_place

## What it is

`esc_final_place` is the **Eurovision Song Contest Grand Final result** for a competing entry — numeric rank (1 = winner) or a special code (`DNQ`, `DQ`, …).

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

### Avoid

| Term | Use instead |
| ---- | ----------- |
| `NQ` | `DNQ` |
| `0`, negative integers | numeric rank or `DNQ` / `null` |

## Virtual `World` country

Non-national clips (interval acts, full-show streams) use **`World`** / `🌍` in manual metadata — display-only, not an ESC vendor country. Vendor join is skipped for `World`. See [`data/metadata/README.md`](../../data/metadata/README.md#virtual-world-country).

## Site

Per-video stats table: sortable **Place** column (`site/src/components/stats/escFinalPlace.ts`). Numeric ranks as `1`, `2`, …; codes as `DNQ`, `DQ`, `Cancelled`, `Pending`, `Non-entry`; `—` when unknown.

Default table sort uses `esc_final_place` ascending after tier counts and before contest year (see [`chart_points.md`](chart_points.md#default-sort)).
