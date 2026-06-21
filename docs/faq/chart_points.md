# chart_points

## What it is

`chart_points` is a **YouTube channel chart score** — a single number derived from how often an upload appeared in the Eurovision Top 20 Most Watched episodes.

It measures **Top 20 performance**, not Eurovision Song Contest **final placement** or televote results.

## Tier columns

Processed and packaged rows include cumulative tier counts per `video_title`:


| Field   | Meaning                                   |
| ------- | ----------------------------------------- |
| `top1`  | Episodes where the upload ranked **1**    |
| `top3`  | Episodes where the upload ranked **1–3**  |
| `top5`  | Episodes where the upload ranked **1–5**  |
| `top10` | Episodes where the upload ranked **1–10** |
| `top20` | Episodes where the upload ranked **1–20** |


Counts are **cumulative** over all episodes through the selected snapshot month.

## Formula

```
chart_points = top20×1 + top10×2 + top5×3 + top3×4 + top1×5
```

Higher ranks weigh more: a `#1` appearance adds 15 points in total; appearing at `#20` adds only 1 point via `top20`.

Implemented in `pipeline/src/evtop20/aggregate.py` (`chart_points_from_tiers`).

## Song roll-up

Song-level stats sum tier counts across video variants, then apply the same formula (`song_stats.py`).

## Default sort

Stats tables sort by `chart_points` descending, then `top1` … `top20`, then `esc_final_place` ascending (1 = winner; special codes after numeric ranks; unknown last), then contest `year` descending, then `video_title` (video grain) or `artist` + `song` (song grain).

Pipeline: `evtop20/sort_keys.py`. Site: `site/src/components/stats/sort.ts` and `queryWindow.ts`.