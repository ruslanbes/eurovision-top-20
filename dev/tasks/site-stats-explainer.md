# Site stats explainer

- **Task ID:** `site-stats-explainer`
- **Status:** done

## Problem

Someone who lands on the site (search, shared link, curiosity) may not know what **Eurovision Top 20: Most Watched** is, or what the Videos / Songs / Episodes / Insights surfaces mean. Existing help is narrow (Chart Points `?` on stats tables) and FAQ lives on GitHub — not a first-visit orientation.

Need a short, plain-language explanation that is **easy to open**, **not permanently in the way**, and available on **every main page**.

## Goal

Add a site-wide “what do these stats mean?” explainer. First-time visitors see a dismissible banner; anyone can reopen the same copy from a header control.

## Audience copy (approved)

> This site tracks the official Eurovision Song Contest [YouTube channel’s](https://www.youtube.com/@EurovisionSongContest) monthly **Top 20: Most Watched** charts.
>
> **Videos** rank the performance of individual clips in the chart. **Songs** aggregate that data per song. **Chart points** measure how high and how often a video or song ranks in the chart.
>
> **Episodes** shows each month’s Top 20 as a row. **Insights** are hand-picked highlights from the data.

Optional deep link in the sheet (not required to understand the banner): Chart Points FAQ [`docs/faq/chart_points.md`](../../docs/faq/chart_points.md).

### Copy check

| Issue in prior draft | Fix applied |
|----------------------|-------------|
| `channe’s` typo | → `channel’s` |
| “aggregate those data” | → “aggregate that data” |
| “are used to measure… the video ranks” | → “measure how high and how often a video or song ranks” (covers Songs too) |

No other blockers. Tone and length are fine for a banner + sheet.

## Decisions (locked)

| # | Topic | Decision |
|---|--------|----------|
| 1 | UI pattern | **Hybrid A** — dismissible banner on first visits; header `?` / `i` always available to reopen |
| 2 | Scope | **All four** routes (Videos, Songs, Episodes, Insights) via `BaseLayout` |
| 3 | Trigger placement | **Header** (with GitHub / theme controls), secondary to brand |
| 4 | Persistence | **`localStorage`** for banner dismissed |
| 5 | Reopen | **Header icon** only (opens same content) |
| 6 | Copy | **Approved** block above |
| 7 | Presentation when open | **Readable sheet / dialog** (not a tiny popover); works on mobile |
| 8 | Chart Points help | **Separate** — do not merge with column `HelpPopover` |

### Behaviour detail (locked)

- Banner under header/nav: visible until user dismisses; then stay hidden across routes/sessions via `localStorage`.
- Header icon always present: opens the sheet/dialog with the approved copy (whether or not the banner is showing).
- Prefer pre-paint hide (inline script, same idea as theme) so returning visitors do not flash the banner before hydrate.
- Banner may be in SSG HTML for first paint / crawlers; dismiss is client-only.

## Rejected for this task

- Footer-only About, first-visit modal, always-visible paragraph, icon-only (no first-visit banner).

## Non-goals

- Replacing FAQ / ADR docs.
- Changing Chart Points popover copy or formula UI.
- Onboarding tour / multi-step checklist.
- Translating to multiple languages (v1).

## Done when

- [x] Approved copy shown in dismissible banner (until dismissed) on all four routes.
- [x] Header icon opens readable sheet/dialog with the same copy; works after banner dismiss.
- [x] Dismiss persisted in `localStorage`; no forced banner on every navigation.
- [x] Keyboard accessible (focus trap or equivalent as needed, Escape to close); sensible on mobile.
- [x] Separate from Chart Points `?` help.
- [x] No layout regression on Videos/Songs/Episodes/Insights.
- [x] `CHANGELOG.md` `[Unreleased]` updated when shipped.

## Notes

- Dedicated layout-level component under `site/src/components/` (island), not the stats `HelpPopover`.
- Theme already uses `localStorage` — same model for dismiss key (e.g. `site-stats-explainer-dismissed`).
