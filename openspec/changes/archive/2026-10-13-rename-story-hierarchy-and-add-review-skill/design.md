## Context

Columns are matched by header name (`columnIndex` in `model.js`), and unrecognised columns round-trip untouched. The current `Feature` header holds story titles and the current `Capability` header holds what the guideline calls a feature, so the new names reuse the word `Feature` for a different meaning. See proposal.md for why.

`user-stories/data-portal.csv` (10 stories, gitignored with the rest of `user-stories/`) is the only backlog on this machine. Story IDs are derived from Epic only, so this change does not touch `ids.js`.

## Goals / Non-Goals

**Goals:**
- Fields, CSV headers and UI labels follow Epic > Feature > Title (story).
- A review skill that reports against `product-management.md` and never writes.

**Non-Goals:**
- No legacy-header translation in the tool and no migration UI.
- No new in-app warnings (single-story feature, INVEST). These are judgment calls and live in the skill.
- No change to the 13-point warning, ID derivation, grouping by epic or dependency rules.

## Decisions

**Rename the model fields, not just the labels.** `story.capability` becomes `story.feature` and `story.feature` becomes `story.title`. Keeping the old property names under new labels would leave code that reads `story.feature` meaning "title" next to a column called `Title`. The rename touches `model.js`, the three components and three test files; it must be done in one pass because the names swap places (`feature` is reused), so rename `feature` to `title` first, then `capability` to `feature`.

**Rewrite the data file once, with no compatibility code (user choice A).** The header line of `data-portal.csv` changes from `ID,Epic,Capability,Feature,…` to `ID,Epic,Feature,Title,…`; row values stay. The alternative was detecting a `Capability` header on load and remapping. It was rejected: it adds a legacy code path for a single local file, and the spec records that old names are not translated.

**Title position in `COLUMNS`.** `Title` goes right after `Feature`, matching the order in the guideline. Files missing it get it appended on save, as `loadBacklog` already does for any missing column.

**List label is the Title alone.** The old `<capability>: <feature>` label existed to tell stories apart. A story title does that on its own, and the Feature is visible in the Stories tab. `storyLabel` returns the trimmed Title or "New story". The Graph node and the "No dependencies" list use the same label, replacing `s.feature.trim() || 'New story'`.

**Feature suggestions narrow by Epic only.** The `featureList` datalist in `StoryForm.jsx` currently filters by Epic and Capability; it now filters by Epic. The Capability list and the Title list are removed.

**Review skill is a repo-local `SKILL.md`, report-only.** It lives in `.claude/skills/review-backlog/SKILL.md` so it is shared with the project. Its frontmatter allows only read tools (no write or edit), which makes "never modifies the CSV" enforced by the tool permissions as well as by the instructions. It reads `product-management.md` for the rules instead of copying them, and carries the one local rule (Small = at most 13 points). The "Independent" check follows the decoupling definition: a link only counts as a problem if the story cannot be built without the other, even with mocks.

**Skill is described by a spec but not covered by tests.** `backlog-review-skill` states the behaviour; there is no automated way to test model judgment, so verification is a manual run against `data-portal.csv`.

## Risks / Trade-offs

- [Old-header CSV outside the repo loads with titles under Feature] → Documented in the spec and proposal; the only local backlog is migrated in this change.
- [Swapping `feature` between two meanings during the rename] → Do the renames in order (`feature` to `title`, then `capability` to `feature`), then run `npm test`; the tests that use `.feature` and `.capability` will fail loudly if a step is missed.
- [Skill findings are model judgment and can be wrong or noisy] → The report presents suggestions and questions (for example single-story features), never edits, and the user decides.
- [Skill instructions drift from `product-management.md`] → The skill points to the file for the rules instead of restating them.
