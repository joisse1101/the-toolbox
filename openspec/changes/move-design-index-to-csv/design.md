# Design

## Context

See proposal.md for why. The current story index is a JSON object inside `Main.dc.html`. `viewer/shared/skill-support/design-index.ts` cuts it out of canvas text (a brace scanner and a strict-JSON fault locator take about half the file), then compares it with the backlog by Title and checks coverage. Design and plan each run it through their own `check-design-index.mjs`, which reads the index from standard input because only Claude can read the canvas. The plan writer (`write-diagram.mjs`) takes the same index as a `design: { url, index }` input field.

The portal already follows story IDs into side files. `POST /api/relink` rewrites `Depends On` and story IDs in the `backlog`, `proposals` and `review` files of every other backlog (`RELINK_FILES` in `viewer/backend/server.ts`). The open backlog's own proposals and review rows follow through frontend hooks. A migration moves open review rows with `moveReviewRows` and writes the target's review file before it changes the open backlog. Files are reached by kind (`KIND_FILES` in `viewer/shared/storage/backlog-paths.ts`).

Three requirements this change modifies exist only in the unarchived change `add-story-design-stage`. It must be archived first (the validator already says so).

## Goals / Non-Goals

**Goals:**

- One source for the index, a file that scripts, the portal and Claude can all read and write.
- An edited criterion is fixed by a small, confirmed row edit, not a redraw of the canvas.
- A renumber, a delete or a migration keeps the rows correct with no manual step.

**Non-Goals:**

- A portal screen or button for the index. Design stays the only stage that writes design data.
- Reading or writing the canvas from a script.
- Deciding by script whether a reworded criterion needs a new screen. That is Claude's judgment, shown as a warning.

## Decisions

### D1. File shape: one row per criterion, seven columns

`<backlog>/design-index.csv` has the header `Story ID,Story,Criterion,Kind,Artboards,Viewports,Canvas`. `Artboards` and `Viewports` hold `;`-joined lists. The reader and writer use the existing `parseCsv` and `toCsv` in `viewer/shared/backlog/csv.ts`, so the file is RFC 4180 with CRLF, which Excel opens. A column the code does not know is kept on read and write, as the story CSV does for unknown columns.

`Story` holds the title for a person reading the file. `Canvas` is repeated on every row. That repeats a link, but it is what lets a migrated row keep its canvas (D6), and Excel users see it beside the row.

Alternative: one JSON file per backlog. Rejected, because the user asked for a CSV like proposals and review, and the portal's file API, the relink helpers and Excel all already handle CSV.

### D2. Match by story ID, then by exact criterion text

Compare reports a story **missing** when its ID is not in the backlog, **changed** when its criteria texts or title differ from the rows, and **new** when a story in the designed scope has no rows and no open clarification. This replaces matching by Title.

Alternative: keep Title as the key. Rejected, because a rename or a split changes the Title, the portal has nothing to follow, and an ID-keyed row is what `retargetRows`-style logic already knows how to move. Frozen stories keep their IDs, so their rows never need a rewrite for renumbering.

### D3. Scope comes from `designs.json`, joined by canvas link

A row does not store the scope. `designs.json` holds `{ scope, url }` per canvas, and a row's `Canvas` joins to it. The checker finds the in-scope stories for the **new** category through that join. A row whose `Canvas` has no entry in this backlog's `designs.json` (a migrated story) is checked for changed and missing only, so a migrated story never makes its new home report a pile of "new" stories.

Alternative: a `Scope` column on every row. Rejected as a second copy of what `designs.json` already says.

### D4. One shared CSV module, used by skills and portal

A new `viewer/shared/design/design-index-csv.ts` holds the row type, `parseDesignIndexCsv`, `serializeDesignIndex`, the row-following helper (rename an ID, drop rows of a deleted story) and the row-moving helper for a migration. `design-index.ts` keeps `compareIndex` and `checkCoverage` and builds its `DesignIndex` from rows. The brace scanner, the fault locator and `INDEX_MARKER` are deleted. `IndexError` stays, with `line` meaning a CSV row number and `field` a column name. `viewer/scripts/sync-skill-logic.ts` copies the new module into both skills, as it does for `design-index.ts`. Both files stay inside `viewer/shared/` and import relatively, as the sync script requires.

The portal helpers do not import the skills' code, and the skills do not import portal code, so the zone rules hold.

### D5. Writer, checker and the update-index mode

`jois-story-design` gains `write-design-index.mjs <backlog> [--check]`. Its standard input is JSON naming a canvas link, the viewports and, per story ID, the criteria to write. It **replaces the rows of the named stories** and leaves every other story's rows alone. A story with an empty criteria list has its rows removed. It checks that each ID is in the backlog, that no story and criterion repeat, that `Kind` is `main` or `failure`, that no criterion is empty and that every stem is lowercase kebab-case ending in the row's viewport. It does not require artboards, so update mode can write a row that still has none. It writes atomically and reads back, like `write-design-pointer.mjs`.

One operation serves both a full design run (all stories of the scope) and update mode (only the changed stories), so there is a single write path and a single set of refusals.

`check-design-index.mjs <backlog>` (design's copy and plan's copy) now reads `design-index.csv`, `designs.json` and the backlog itself, with no standard input.

**Update-index mode** is a section of design's `SKILL.md`, started when the user asks to update the index or chooses it after a stale report. For each changed story it keeps rows whose text still matches, then pairs the leftover old and new criteria. Equal counts are paired by position and shown for confirmation. Different counts make it ask the user which new criterion replaces which old one, and it never guesses. A paired row keeps its artboards. An unpaired new criterion becomes a row with no artboards, and an unpaired old one is dropped. It lists every change with old and new text and ends with one yes/no. A criterion that is new, or whose rewording probably changes a field, a message or a state, gets a warning that a full design run must draw it. A changed criterion of a frozen story is not rewritten, and the skill names a superseding story as the way forward. The mode needs no Artifact tool and publishes nothing.

Alternative: put update in plan. Rejected: the user chose design, and plan writes plan files only.

### D6. The portal follows IDs into the file

The new kind `design-index` maps to `design-index.csv` in `KIND_FILES`. The file API reads a missing file as empty, as for the other non-backlog kinds, and the allow-list comment and the "five kinds" text become six.

- **Other backlogs.** `RELINK_FILES` gains `{ kind: 'design-index', relink: relinkDesignIndexText }`. A row names only its own backlog's story, so in normal use nothing is written. The entry exists for a migration: moved rows keep the source's old IDs as written (as moved review rows do), and the relink that follows the source's save renames them in the target. This copies the review rows' convention exactly.
- **The open backlog's own file.** No screen holds the file, so the frontend cannot follow IDs for it. The relink request rewrites the changing backlog's own `design-index.csv` as well, and drops the rows of a story whose change is `''`. This rewrite is not idempotent under a swap of two IDs, so it runs once per change list: only when the request has no `only` list, or when `only` names the backlog itself, which is the retry of a failed file. The reply's `failed` list names the file, so the existing retry covers it.
- **Migration.** `moveDesignRows`, beside `moveReviewRows`, takes the rows of the migrated stories from the source file to the target's. The flow writes the target's design file after the target backlog and its review file, and before it changes the open backlog, so a failed write leaves the stories in both backlogs. A target with no file gains one. The confirmation adds a count of the design rows that move.

Alternative: a `useDesignIndex` frontend hook that loads the file and retargets rows like `useReview`. Rejected, because it adds a feature folder, state and tests for a file with no screen, and the server already sees every ID change.

The apply tasks read `useMigrateFlow.ts` and `useAutosave`'s forwarding code before coding, to confirm how the target's own renumber is followed for review rows, and copy that path for design rows.

### D7. Plan reads the file itself

`write-diagram.mjs` reads `design-index.csv` and `designs.json` itself. The `design` input field is removed, and an input that still carries it is refused with a message that names the file, so an old prompt cannot silently send a stale index. A `Design` line is valid when its link is a row's `Canvas` plus one of that row's artboard stems for a criterion the task satisfies. A story in a scope that `designs.json` links but with no rows makes the writer refuse the slice. `diagrams/tasks.js` matches criteria to rows by story ID and exact text instead of Title.

Plan's stale stop (the checker's `changed`, `missing`, `new`) stays and points to update mode for reworded criteria and to a design run for a story that needs a screen. Plan no longer needs the Artifact tool for the index, so that step can run in a headless session. Apply and validate agents still open artboards and still need the tool.

### D8. `Main` becomes a cover page

`design-conventions.md` section 1 becomes "The story index file" with the columns and rules above. The `Main` section says `Main` lists flows and artboard names with links, and holds no criterion text and no data object. Section 2 (artboards) is unchanged. A canvas made before this change keeps its old `Main` until the next design run on its scope, which reads that index once, writes the rows and replaces `Main`.

### D9. One change, ordered groups

The size rule suggests splitting the file format and skills from the portal's ID-following. They share the file shape, and a migration without the relink would leave stale rows, so they ship together. The tasks put the portal in its own group, so the apply flow commits it as its own concern, and it can be moved into a separate change if the review prefers.

### D10. Tests use mock design files, and the sample is left alone

The sample's `designed` stage is not in this checkout: there is no `stages/designed/`, `build-mock-repo.ps1` has no `designed` stage, and the pull request that merged the design skill (#147) did not carry them, although `add-story-design-stage` lists them as done. Without a recorded canvas there is nothing real to derive rows from, and re-recording publishes to claude.ai and costs model tokens, which needs the user's approval.

So this change adds a mock `design-index.csv` and `designs.json` (a made-up canvas link) next to the `habits` fixture in `toolkit/tests/story/fixtures/`, and the unit tests and the live tests both use them. The live tests build the mock repo at the sample's existing `accepted` stage and copy the fixture files in. The sample, its README and its stage test are not changed. Recording the `designed` stage stays open work of `add-story-design-stage`, and the proposal notes that it must then hold `design-index.csv`.

## Risks / Trade-offs

- **Hand edits in Excel can break rows** (a bad ID, a stem with a typo). → The checker and the plan writer refuse an unreadable file and name the row and column, and Design stops rather than guesses.
- **A reworded criterion that needs a new screen can be rewritten without one.** → Update mode warns on new and probably affecting changes and leaves the row without artboards, which the coverage check reports as a design problem, so plan's `Design` rule still catches it.
- **The own-backlog rewrite can apply twice on a retry.** → It runs once per change list, with the rule in D6, and a test covers a swap of two IDs and a retry.
- **A migrated row points at a canvas this backlog's `designs.json` does not list.** → D3 and D7 accept the row's own `Canvas`, and the design skill adds the pointer on the next design run for that scope.
- **Three deltas modify requirements that are not in the main specs yet.** → `add-story-design-stage` is archived first. `openspec validate` reports this as information until then.
- **A global copy of a skill loads ahead of the project copy.** → Live tests run in `.scratch/mock-app/` after a project-scope reinstall, and each run first checks which copy loaded. The global copy is never touched.

## Migration Plan

Archive `add-story-design-stage`, then apply this change. No data migrates: no design made by the earlier flow is known to exist. A design made earlier converts at its next design run (D8). Rolling back means reverting the change; a `design-index.csv` left behind is ignored by older code, because it is not a known kind there.

## Open Questions

- Settled by the spike of task 5.1 (2026-11-23). A headless `claude -p --model sonnet --strict-mcp-config` session started in the mock repo does load a skill through the Skill tool when the tool is allowed. But the copy it loads is the **global** one in `~/.claude/skills/` (its base directory said so, and it had no update-index mode), which is older than the project copy. The global copy is never touched, so the live tests use headless Sonnet sessions with `--disable-slash-commands` and tell each session to read the project copy of `SKILL.md` by path (`.claude/skills/<skill>/SKILL.md`) and run its scripts from there. The prompt carries the user's answers, since a headless session cannot ask. That tests the edited text and scripts, not the Skill tool's loading of them.
