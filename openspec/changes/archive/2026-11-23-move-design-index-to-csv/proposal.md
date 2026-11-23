## Why

The story index of a design, which maps each acceptance criterion to the artboards that show it, sits inside the canvas's `Main.dc.html`. Only Claude can read or change it, and only through the Artifact tool. When stories change upstream (a migration, a renumber, a split, an edited criterion) the index goes stale and someone has to redraw or hand-edit the canvas. Proposals and review suggestions avoid this because they are CSV files that the portal relinks when story IDs change. The index should work the same way.

## What Changes

- The story index moves out of `Main.dc.html` into `<backlog>/design-index.csv`, one row per acceptance criterion, keyed by story ID, with the criterion's exact text, its kind (`main` or `failure`), its artboard stems, its viewports and the canvas link.
- The file is committed, like `designs.json`, and archive leaves it alone. It is the one durable record of which artboard shows which criterion, because archive deletes `tasks.md` and its `Design:` lines.
- `Main` becomes a cover page: flows and artboard names, no criterion table. The CSV is the single source, so there is no second copy to drift.
- `design-index.ts` reads CSV rows instead of cutting JSON out of canvas text. The compare and coverage logic stays, but matching is by story ID instead of Title. `check-design-index.mjs` in design and plan reads the file itself, with no hand-over from Claude.
- `jois-story-design` gains an **update-index mode**. It rewrites the rows of changed criteria without redrawing the canvas, drops the rows of a criterion that no longer exists, and warns when a new or changed criterion probably needs a screen it cannot draw in this mode. Design stays the only stage that writes design data. There is no portal screen or portal action for the index.
- The plan writer reads the CSV itself and no longer takes the index as input. Plan can therefore run headless for this part. Apply and validate still need the Artifact tool, because their agents open the artboards.
- The portal follows story IDs into the file. A row names only its own story, so no other backlog's file ever names it. When a backlog's IDs change, the server's relink request also rewrites that backlog's own `design-index.csv`, because no screen of the portal holds the file. A migration moves the rows of the migrated stories to the target backlog's file, with new IDs, and each row keeps its own canvas link, so the target's plan finds the design of a migrated story. Rows of a deleted story are dropped.
- `wiki/Story-To-Code.md` is updated in each section the change touches, and the Data Folder, Story Skills and Toolkit pages are brought in line.
- Tests use mock data only: a fixture `design-index.csv` and `designs.json` with a made-up canvas link beside the existing `habits` test fixture, and a mock repo built at the sample's `accepted` stage. Nothing is published or read from a real canvas.
- **BREAKING** for any design made by the `add-story-design-stage` flow: its index lives in the canvas and has to be moved into the CSV once, by the next design run on that scope. No such design is known to exist.

## Capabilities

### New Capabilities

None. The file belongs to the design skill, the backlog layout and the portal's ID-following, which already have specs.

### Modified Capabilities

- `story-design-skill`: the story index is the CSV and `Main` is a cover page. This adds the update-index mode and the row writer, and changes the stale-index check to read the file and match by story ID.
- `slice-tasks`: the plan writer reads `design-index.csv` itself and checks `Design:` links against it.
- `plan-stories-skill`: plan reads the CSV for the design of its scope and runs the stale check on it.
- `plans-file-lifecycle`: the file is `committed` and is not removed by archive.
- `backlog-folder-layout`: the folder may hold `design-index.csv`, and the file API addresses it as a sixth kind.
- `cross-backlog-links`: changed and deleted IDs are followed in the backlog's own design index.
- `story-migration`: the design rows of migrated stories move with them, and the write order covers the new file.

The requirements of `story-design-skill`, `slice-tasks` and the design parts of `plan-stories-skill` exist today only in the unarchived change `add-story-design-stage`. That change must be archived before this one, so that its specs are in `openspec/specs/` and these deltas have requirements to modify.

The sample project gains its `designed` stage, which `add-story-design-stage` describes but this checkout lacked. It is recorded by hand from the existing canvas "Habits Streaks design" (`designs.json`, `design-index.csv`, the build script, the README and the stage test), and that canvas's `Main` is replaced with the cover page, so the sample follows the flow as the flow changes. The planned and later stages are not re-recorded.

## Impact

- `viewer/shared/skill-support/design-index.ts` and its test, `viewer/shared/guidelines/design-conventions.md`, `plans-files.ts` and its guideline, and the sync script's file lists.
- `viewer/shared/storage/backlog-paths.ts` (a sixth kind), `viewer/backend/server.ts` (the kind allow-list and the relink pass), `viewer/shared/backlog/relink-text.ts`, a new row-moving helper beside `moveReviewRows`, and `useMigrateFlow.ts`.
- `toolkit/skills/jois-story-design/` (a row writer, the update-index mode in `SKILL.md`, the checker) and `toolkit/skills/jois-story-plan/` (`check-design-index.mjs`, `write-diagram.mjs`, `diagrams/tasks.js`, `SKILL.md`), plus their generated `lib/` and `references/` copies.
- `toolkit/tests/story/fixtures/habits/` (mock design files for the tests).
- `wiki/Story-To-Code.md`, `wiki/viewer/architecture/Data-Folder.md`, `wiki/viewer/Story-Skills.md` and `wiki/toolkit/Toolkit-Guide.md`.
- No new dependency. No change to `task-applier`, `code-validator`, apply, validate or archive.
