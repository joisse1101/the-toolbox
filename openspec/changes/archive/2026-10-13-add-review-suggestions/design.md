## Context

`review-backlog` currently reports in chat only, with `allowed-tools: Read, Grep, Glob`. The portal loads one backlog through `createFileStore('user-stories')`, keeps it in the `useBacklog` reducer and autosaves it. Story IDs are derived (`renumber`) and shift when stories move or change Epic, and the pure modules (`csv.js`, `model.js`, `story-text.js`) already run under `node --test`. The server only serves folders registered in `STORES`.

The `backlog-review-skill` spec (rule: the skill SHALL NOT modify any file) is still inside the in-flight change `rename-story-hierarchy-and-add-review-skill`, so it cannot be modified by a delta yet. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Every finding becomes a field edit the portal can show and apply.
- The skill's only write path is a script whose guardrails are code, not instructions.
- Applying goes through the existing reducer so ID and dependency invariants hold.

**Non-Goals:**
- No change to what the skill checks (hierarchy, INVEST, acceptance criteria) or to the chat report's content.
- No auto-apply, no bulk "apply all" (can be added later; each row is independent).
- No review history: a review file holds the latest review only.
- No OS-level sandbox for the skill (see Risks).

## Decisions

**Node script, sharing the app's parsers.** `write-review.mjs` imports `src/shared/csv.js`, `src/shared/story-text.js` and `src/user-story-generator/model.js` (`loadBacklog`). Python was rejected: the repo is Node-only and a port would duplicate CSV and criteria parsing and drift from what the portal compares. The script is unit-tested with `node --test`.

**One shared review module.** `src/user-story-generator/review.js` is pure and holds: the column list and allow-lists, `parseReview` / `serializeReview`, `validateFindings(findings, backlog)`, `fillCurrent`, and the portal-side `suggestionState(story, row)` (open / stale) and `applySuggestion(draft, row)`. The script and the portal both import it, so what the script writes and what the portal checks cannot disagree.

**The model sends intent, the script fills the facts.** Input JSON per finding: `storyId, field, action, suggested, reason, area, confidence, group`. The script computes `Current` and sets `Status` itself, ignoring caller values, so a hallucinated `Current` cannot make a stale row look fresh.

**Row semantics by Field and Action** (validated as a table in `review.js`):

| Field | replace | add | remove | append |
|---|---|---|---|---|
| Epic, Feature, Title, User Story, Sprint points, Priority | set value | - | - | - |
| Notes | set value | - | - | add on a new line |
| Depends On | - | add one story ID | remove one story ID | - |
| Acceptance Criteria | `Suggested` is `AC<n>: Given..., when..., then...`, replaces criterion n | `Suggested` is one criterion line, appended | - | - |

`User Story` replace takes the full `As a..., I want..., so that...` text and is parsed with `parseStory`; a value that does not parse is rejected by the script. `add-story` rows are one field per row for a `NEW-<n>` story. `Sprint points` must be on the POINTS scale.

**Stale = compare to `Current`.** A row is open only if the live story still matches what the row expects (rules in the spec). Story IDs are looked up by `code`, so a renumbered story fails the lookup and the row is stale rather than landing on the wrong story. This is the reason `Current` is stored at all.

**Group apply is one reducer action.** A new action `applySuggestions` takes the story id and the rows of a group and returns the new stories array in a single `withStories` call, then `renumber` assigns the new stories' IDs. Single-row Apply uses the same action with one row, so there is one code path. New stories are appended to the backlog (display order groups them by Epic).

**Status write-back uses the file API on the `reviews` store.** `createFileStore('reviews')` already provides read and write, and the Vite dev proxy forwards `/api`. After Apply or Dismiss the portal rewrites the review CSV with the new Status. This reuses the autosave pattern (debounce, retry when locked) through a small second instance of `useAutosave`'s machine rather than a new mechanism. The backlog edit is not tied to the review write succeeding.

**`reviews` store and data folder.** `STORES` gets `reviews: path.join(__dirname, 'reviews')`. The folder is git-ignored like `user-stories/` because it is derived from private backlogs. It is separate from `user-stories/` so review files do not appear in the backlog dropdown and the skill never has a path into the autosaved file.

**Skill permissions.** `allowed-tools` becomes `Read, Grep, Glob, Bash(node .claude/skills/review-backlog/write-review.mjs:*)`. `SKILL.md` instructs: collect findings, pipe JSON on stdin (heredoc), pass the backlog file name as the only argument, fix and re-run on validation errors, then print the chat report summarising the same findings and naming the review file.

**Re-runs keep decisions.** On write, a new row matching an existing row on Story ID + Field + Action + Suggested inherits its Status. Otherwise the whole file is replaced.

**Atomic write.** Write `reviews/<name>.tmp` in the same folder, then rename over the target. A failed run leaves the old file intact.

## Risks / Trade-offs

- [A `Bash(...:*)` rule is a command-prefix permission, not a sandbox] -> The script takes no path argument and its output location is fixed, so the exposure is the script's own behaviour. Residual risk accepted; `SKILL.md` and the spec both state the script is the only write path.
- [Model puts the wrong content in a field, e.g. an unparseable User Story] -> The script validates with the app's own parsers and rejects the whole input with all errors, so the model fixes and retries.
- [Stale rows after IDs shift] -> Shown as stale with Dismiss only; re-running the review regenerates them.
- [Group apply creates stories with partially filled fields] -> `add-story` requires a Title; the editor's existing completeness warnings flag anything else missing.
- [Re-run status matching hides a changed reason] -> Matching ignores Reason deliberately; only the edit identity matters.
- [The in-flight spec still says "SHALL NOT modify any other file"] -> Tasks include amending that requirement once `rename-story-hierarchy-and-add-review-skill` is archived (a MODIFIED delta cannot target it before then).

## Migration Plan

No data migration. `reviews/` is created on first write. Rollback is reverting the skill's `allowed-tools` and ignoring the folder; backlog files are never altered by this feature except through ordinary autosaved edits.

## Open Questions

- Should the chat report keep the full text or shrink to a summary plus a pointer to the portal? Default in this design: keep the report as is, add a line naming the review file. Revisit after use.

## Additions after the first apply session

- **Priority is not reviewed.** It is removed from the Field allow-list in `review.js`, so the script rejects it; `SKILL.md` says to ignore it. Old rows naming it are skipped when a review file is read.
- **`remove` on Acceptance Criteria.** `Suggested` is the label alone (`AC4`); `Current` is that criterion's text, so the portal shows what will go and treats the row as stale if it was edited or moved. When one story has several criterion edits they are applied replace first, then removes from the last criterion up, then adds, so every label still means what the review saw. A story whose last criterion is removed keeps one blank row, as the form always does.
- **Review tab.** `reviewOverview(rows, stories)` in `review.js` (pure, tested) returns open units grouped by Area in backlog order, plus an "Out of date" list (stale rows and rows whose story is gone). `ReviewTab.jsx` renders them with the same `Suggestion` component as the story form, with a link that opens the story. The tab exists only while the backlog has a review file. There is deliberately no "apply all": each `confirm` default should be looked at.
- **Rewording must not grow the story.** This is guidance to the model in `SKILL.md`, and a spec requirement. It cannot be checked by the script.
