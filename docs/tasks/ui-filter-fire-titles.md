# ui-filter-fire-titles

Site UI filter: show only rows whose **song/title** matches “fire” in **any language** (multilingual keyword list, not English substring only).

Parent: site (shipped Slice 1)  
Blocked by: [`package`](../../BACKLOG.md) (packaged data in site)  
Related: [ADR-003](../adr/adr-003-data-layers.md), [`data/README.md`](../../data/README.md), [`site/README.md`](../../site/README.md)

**Status:** Backlog — small UI feature.

## Goal

Toggle or filter on the stats table (video grain v1): **“Fire songs”** — rows where the matched keyword appears in `video_title` and/or parsed `song` field.

## Matching (draft)

Case- and accent-insensitive token/substring match against a curated list, e.g.:

| Language | Forms (examples) |
|----------|------------------|
| English | fire |
| French | feu, feux |
| Spanish | fuego |
| Portuguese | fogo |
| German | feuer |
| Italian | fuoco |
| Dutch | vuur, brand |
| Swedish | eld, brand |
| Norwegian | ild, brann |
| Finnish | tuli, palo |
| … | extend as corpus reveals hits |

**v0:** static list in pipeline (`package`) → packaged boolean per row; site toggles visibility without client-side language logic ([`data/README.md`](../../data/README.md)).

## Done when

- [ ] Keyword list defined + tested on corpus (jq audit or pytest fixture)
- [ ] Sitedata rows include `matches_fire_filter` (or dedicated filter index file)
- [ ] Stats table has a “Fire” filter control; works in light/dark theme
- [ ] Documented word list in this task or `pipeline` constants

## Out of scope

- Fuzzy match / translations API
- Song-grain table until Beta (can reuse same flag when song stats exist)
