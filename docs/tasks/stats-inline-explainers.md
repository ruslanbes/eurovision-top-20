# stats-inline-explainers

Add on-demand explanations for stats concepts (starting with `chart_points`) without permanent screen clutter.

Parent: [`stats-table-filters`](stats-table-filters.md)  
Depends on: existing stats table/header controls in `site/src/components/stats/`  
Related: [`chart_points.md`](../faq/chart_points.md), [`site-theming.md`](site-theming.md)

**Status:** Ready

---

## Problem

Users need quick clarification of domain terms (for example, `chart_points`) while reading the table. Current UI has no obvious in-context explainer. Permanent helper text adds noise.

Goal: provide explanation only when requested, keep it easy to rediscover, and make the pattern reusable for future one-time help items.

---

## Input options considered

### 1) Info icon/emoji + tooltip

**Pros**
- Minimal footprint.
- Fast to implement.

**Cons**
- Weak on touch/mobile and keyboard if implemented as native `title`.
- Multi-line content is fragile in native tooltip UI.
- Tooltips are better for short supplemental hints, not richer explainers.

### 2) Dismissible inline text block above table

**Pros**
- Very readable; can hold full formula and examples.
- Works well for all input modes.

**Cons**
- Occupies vertical space when open.
- Needs persistence policy (session/localStorage) and re-open affordance.

### 3) LLM chatbot assistant

**Pros**
- Flexible, conversational explanations.

**Cons**
- Major scope, infra, and reliability overhead for a small static-site need.
- Overkill for deterministic formula explanations.

### 4) Separate FAQ page

**Pros**
- Good long-form source of truth.
- Reusable for docs and sharing links.

**Cons**
- Context switch away from the table.
- Slower for quick "what is this?" checks.

---

## Web-pattern takeaways (summary)

- Tooltip: use only for short, non-critical, non-interactive hints; not for essential or long guidance.
- For richer on-demand help, use click/tap/focus-triggered popover or inline disclosure.
- Keep a visible trigger near the concept and support keyboard/screen-reader usage.
- Keep detailed long-form explanation in FAQ and optionally link to it from the in-context helper.

Sources reviewed:
- [NN/g Tooltip Guidelines](https://www.nngroup.com/articles/tooltip-guidelines/)
- [MDN ARIA tooltip role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/tooltip_role)
- [GitLab Pajamas contextual help](https://design.gitlab.com/usability/helping-users)

---

## Recommendation

Implement a reusable **Help trigger + popover card** pattern for stats controls/headers.

### Why this fit

- On-demand, no permanent clutter.
- Supports multi-line formula text better than tooltip.
- Works on click/tap and keyboard focus.
- Reusable for future explainers (not only `chart_points`).

### First use-case: `chart_points`

Trigger placement candidates:
- Next to table title/count line, or
- In `Chart Points` column header.

Popover content (v1):
- "What is chart points?"
- Formula: `top20×1 + top10×2 + top5×3 + top3×4 + top1×5`
- One short interpretation line (`#1` contributes more than lower ranks).
- Optional link: "More details" → [`docs/faq/chart_points.md`](../faq/chart_points.md)

---

## UX + accessibility requirements

- Trigger is a real button (icon + accessible label), not `title`-only.
- Open on click/tap; keyboard operable (`Enter`/`Space`).
- Dismiss on outside click and `Escape`; returns focus to trigger.
- Clear `aria-expanded` state on trigger.
- Popover is readable in light/dark and does not block key table interactions.
- Keep content concise; no interactive controls inside tooltip-role variant.
- If richer content/actions are needed later, use dialog/popover semantics (not ARIA tooltip).

---

## Architecture sketch

```text
site/src/components/stats/help/
  HelpTrigger.tsx        # icon button + open/close state + a11y attrs
  HelpPopover.tsx        # positioned card, dismiss behavior
  helpContent.ts         # keyed explainer copy
```

Integration points:
- `StatsExplorer.tsx` (count/title area) and/or `StatsTable.tsx` header renderer.
- `site/README.md` brief note for explainers.

---

## Done when

- [ ] Reusable help trigger/popover component exists and is theme-aware.
- [ ] `chart_points` explainer is available on demand in stats UI.
- [ ] No persistent extra text in default collapsed state.
- [ ] Keyboard + screen-reader behavior verified (open/close/focus/Escape).
- [ ] `npm test` + `npm run build` pass.
- [ ] FAQ link path validated (`docs/faq/chart_points.md`).

## Out of scope (v1)

- LLM/chat integration.
- Personalized or adaptive onboarding tours.
- Full help center IA redesign.
