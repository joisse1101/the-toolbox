# Design

## Context

The portal lives in `planner/portal/web/backlog-portal/` and styles itself from two files, `planner/portal/web/shared/style.css` and `planner/portal/web/backlog-portal/tool.css`. Colours are already CSS custom properties (variables such as `--muted`), but sizes, spacing and shadows are one-off numbers. The project has tests only for pure modules, with no DOM tests, so most of this change is checked in a browser. See proposal.md for the reasons and specs/ for the required behaviour.

The review found the sizes of the large components (about 450 lines for `GraphTab`, 360 for `App`, 330 for `StoryForm`, 210 for `StoriesTab`). Those figures come from a reading by a review agent, not a count, so the first task of stage 4 measures them.

## Goals / Non-Goals

**Goals:** one set of scales in CSS variables, a small set of shared components (confirm dialog, tab header, empty state, row button, layout helpers) used by every tab, and no change to what the portal saves or where.

**Non-Goals:** a new visual theme, a new colour palette hue, a DOM test framework, and any change to the CSV formats or to `planner/logic/`.

## Decisions

### Scales live in `shared/style.css` as CSS variables

The scales go in the file all pages already load, so the landing page and the portal share them. The type scale is 12, 14, 16, 20 and 24px. The spacing scale is 4, 8, 12, 16, 24 and 32px. There are three radii (small, medium, full), four shadows and a grey ramp with an accent ramp of five shades. The alternative was a utility-class system such as Tailwind. It would add a dependency and rewrite every component, which is far more than this change needs. Existing colour variables keep their names, so no component breaks while the rest is converted.

### Convert stylesheet by stylesheet, not by component

Stage 1 only changes the two CSS files plus the graph's sizing code. Converting values in place keeps the diff reviewable and lets one browser pass confirm the whole look. A component-by-component rewrite was rejected because it would mix styling changes with the stage 4 splits.

### One confirmation dialog, called through a promise

A `ConfirmDialog` component with a `useConfirm()` hook returns a promise that resolves true or false. The existing code calls the blocking `confirm()` in the middle of reducer actions (`useBacklog.js`, `useProposals.js`, `useAutosave.js`), and a promise fits that shape with the least rewriting: each `if (!confirm(...)) return` becomes `if (!(await ask(...))) return`. The alternative of state-driven dialogs per feature was rejected because it would duplicate the dialog five times. The dialog uses the native `<dialog>` element, which gives focus trapping and Escape for free.

### Hidden rows are excluded, not warned about

The simpler rule is that a bulk action works on ticked rows that are also visible. The ticked-but-hidden count is shown beside the count of visible ones. Clearing the selection whenever a filter changes was rejected because it loses the user's work when they only narrow the view for a moment.

### Missing optional files are answered by the server

The browser logs every failed request, so handling the 404 in the client would still leave console errors. The server therefore answers an empty file for the four optional kinds when the folder exists. It still answers 404 when the backlog folder itself is missing. The check is in the server's read route and gets a test in the existing server tests.

### Graph fit uses a resize observer

The canvas observes its own size and re-runs the fit, with the scale clamped between the zoom that keeps node text at 11px and 150%. Fitting once on load was the old behaviour and caused the cut-off graph after a resize.

### Component splits follow screens, not line counts

`GraphTab` splits into toolbar, canvas, detail and unlinked list. `StoryForm` splits by section, with the arrow-key helper moved to its own module. `StoriesTab` splits into bulk bar, filter row and table. `App` moves its review, proposed and shortcut logic into hooks. Stack, Row and Grid helpers take the spacing token. This stage runs last and changes no behaviour, so a browser pass before and after should look identical.

## Risks / Trade-offs

- **Rounding odd sizes to the scale shifts the layout slightly** → check each screen in the browser at 1440px and 900px before and after stage 1.
- **The promise-based dialog changes control flow in the reducers** → convert one caller at a time and run the pure-module tests after each.
- **Making a row a real button changes its default styling** → the row button resets its own look, so the row looks the same.
- **Contrast figures from the reviews were estimated by eye** → measure the final colours with a contrast check, and record the result in the task.
- **The browser checks need the app running** → use a scratch copy of the sample data under `.scratch/`, never the real data folder.

### The Review tab's Accept all stays; the spec is corrected

`backlog-review-suggestions` contradicted itself: "Review tab" said there is no "apply all" action, while "Accept all applies every open suggestion of an area" requires the buttons. The user chose to amend the spec, so the delta in `specs/backlog-review-suggestions/spec.md` drops the stale sentence and points to the Accept all requirement. The buttons are unchanged. Their confirmation moves to the shared dialog like every other confirmation, which that requirement already allows because it only asks that the tool "ask the user to confirm".

"Clear all" on the Review tab has no requirement in `backlog-review-suggestions`. `portal-safe-actions` covers its confirmation, and no further spec is added for it.
