# Logic Layer

The pure logic in `planner/logic/` and the script that copies it into the story skills. For how the files it handles are laid out, see [Data Folder](Data-Folder.md).

## Zones

The code is in three zones that depend in one direction only, and `planner/test/zones.test.mjs` enforces it. `planner/logic/` imports nothing outside itself, `planner/portal/` imports `planner/logic/` and `planner/guidelines/`, and `toolkit/` imports nothing outside itself. Nothing in `planner/logic/` imports the portal, and nothing imports the contents of `planner/data/`.

## What the layer is

`planner/logic/` is pure logic: no DOM and no HTTP. It is shared by the portal and, as a generated copy, by the story skills (see "The sync script" below). It is grouped in folders by domain. Code only the skills use sits in `planner/logic/skill-support/`, and code only the portal uses sits with the portal, in `planner/portal/web/lib/` (`collapse`, `panel-size`, `story-table`, `word-diff`). There is no backup feature.

## Backlog modules

`planner/logic/backlog/csv.js` parses and serializes CSV. `planner/logic/backlog/story-text.js` composes and parses the "As ... I want ... so that ..." text and the acceptance-criteria cell text. The role keeps its article, so `asA` reads "a team lead" or "an approver", and `roleIsBlank` treats a bare "a" or "an" as empty.

`planner/logic/backlog/model.js` is the pure conversion between CSV and the story model. Known columns (`COLUMNS`, including `Frozen`) are matched by header name. `Frozen` is `Yes` or empty and is valid only on a story with an ID. An old `Locked` column is ignored on load and dropped on save (never read as frozen). `loadBacklog(text, { placeholderIds, initials })` passes the backlog's initials to `renumber`. Unknown columns round-trip untouched in `story.cells`, and a User Story or User Acceptance Criteria cell that cannot be parsed keeps its raw text.

`planner/logic/backlog/ids.js` handles story IDs such as `B1-IAM-0003`: `<initials>-<epic prefix>-<NNNN>`. The initials belong to the backlog, the epic prefix is the first letters of the epic name's words, and the number is the position within the epic. When two Epics give the same prefix, the later one gets a digit (`IAM`, `IAM1`, `IAM2`). IDs are derived, not stable. `renumber(stories, initials)` recomputes them on add, delete, reorder, move and open, and rewrites the `Depends On` links (IDs separated by `;`) so each link follows its story. Keep this invariant when touching story ordering.

A frozen story (`story.frozen`) is read-only and a fixed point of `renumber`. It keeps its whole code, and only the epic part of that code is pinned: its epic keeps that prefix even when the backlog's initials change. Other stories take the current initials and the lowest free numbers around the frozen ones (reserved per full prefix), so gaps are fine. A frozen flag cannot be removed. The guards live in the same file:

- `moveStory`, `moveGroup`, `removeStory`, `removeStories` and `commitEpic` leave a frozen story alone.
- `applyBulk` skips a frozen story completely and reports how many it skipped.
- `freezeStories(stories, ids)` is the only way to set the flag. It skips stories without an ID and returns them.
- `moveToProposed` refuses a frozen story, and a review suggestion on a frozen story is never applicable. The `unlock` action is gone: the writer rejects it and an old `unlock` row loads as stale.

`planner/logic/review/review.js` and `planner/logic/backlog/proposals.js` hold the review-suggestion and proposed-story logic. The proposal writer's `proposal-input.js` and the review skill's `backlog-checks.js` live in their skill folders in `toolkit/skills/`, not here.

## Lexicon module

`planner/logic/lexicon/lexicon.js` handles the backlog's lexicon, `<backlog>/lexicon.csv`. It is a CSV with `Term`, `Part of`, `Definition`, `Avoid` and `Notes`, where `Avoid` is `;`-separated and unknown columns round-trip in `cells`. It has `parseLexicon` and `composeLexicon`, and it holds the term rules in one place for the Lexicon tab and the writer script:

- Names are unique, ignoring case.
- A definition is required.
- `Part of` must name a term, with no self reference and no cycle.
- An `Avoid` word may not be a term name.
- A term with children cannot be deleted.
- A rename rewrites its children's `Part of`.

Only problems a change introduces are refused, so an old problem in a hand-edited file never blocks an unrelated save. `applyTermItems` is the writer's add step, and it refuses a term that exists. The suggestion rules are in `planner/logic/lexicon/lexicon-suggestions.js`.

## Storage modules

The storage code is described on [Data Folder](Data-Folder.md): `planner/logic/storage/file-name.cjs`, `planner/logic/storage/backlog-paths.cjs`, `planner/logic/storage/paths.cjs`, `planner/logic/storage/project-config.cjs` and `planner/logic/storage/project-folders.cjs`.

## The sync script

`planner/scripts/sync-skill-logic.mjs` writes the shared `planner/logic/` files and the guidelines into each story skill's `lib/` and `references/`, so an installed skill needs nothing from this repo. `planner/guidelines/` (`product-backlog.md`, `sprint-points-guideline.md`, `diagram-conventions.md`) is shown in the portal and copied into the skills. `planner/guidelines/product-backlog.md` is the single source of backlog standards (epic, feature, story and acceptance-criteria definitions, the 13-point size cap and INVEST), used for both writing and reviewing stories, so the review skill cites it and does not restate it. `planner/guidelines/sprint-points-guideline.md` covers point sizing benchmarks. `openspec/` stays at the repo root because the OpenSpec CLI looks for it there. The details of the copy are on [Story Skills Internals](Story-Skills-Internals.md).
