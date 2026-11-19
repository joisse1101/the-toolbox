# Design

## Context

See proposal.md for why. Priority runs through four layers: the shared model (`viewer/shared/backlog/model.ts`, which parses and writes the CSV), the React portal (Stories tab and story form), the story skills in `toolkit/skills/` and the specs, wiki and sample data.

Three facts shape the approach:

- The loader already retires a column. A `Locked` column is filtered out of the parsed rows before the column index is built, and `changed` is set so the file is saved without it (`model.ts`, `OLD_LOCKED_COLUMN`). The portal counts a `changed` load as an edit (`useBacklog.ts`), so auto-save rewrites the file as soon as it is opened.
- Unknown columns are carried through untouched. A column that is in neither `COLUMNS` nor the legacy list would survive a load and a save, so just deleting `'Priority'` from `COLUMNS` would keep the old column in every existing file.
- The four copies of `model.mjs` and the two of `story-search.mjs` under `toolkit/skills/*/lib/` are generated from `viewer/shared/` by `viewer/scripts/sync-skill-logic.ts`. They are never edited by hand.

## Goals / Non-Goals

**Goals:**
- No code path reads, shows, writes or warns about Priority.
- Existing files lose the column the first time the portal opens them, using the mechanism that already exists for `Locked`.

**Non-Goals:**
- No archive, export or undo of the dropped Priority values. The portal keeps no backup (the backend skips any `backups/` folder), so the old values exist only in whatever copy of the data folder the user keeps, such as a git history.
- No change to Sprint points, to the other warnings or to the Alt+Right / Alt+Left stepping inside the Sprint points buttons.
- No removal of the word "prioritised" from the INVEST guideline text: it is ordinary English, not the field.

## Decisions

### Drop the column on load, like `Locked`

The loader treats `Priority` as a second legacy column. It filters both legacy headers out of every row in one pass, and `changed` is true when either was found. This keeps one retirement mechanism instead of two, and it applies to the proposals file and any other file read through `loadBacklog`, not only the backlog.

Alternatives considered: leaving old columns as unknown columns (nothing is deleted, but every old file keeps a column the tool no longer explains, and the sample data and wiki would still need to describe it). The user chose dropping.

### Remove the field everywhere in one change

`priority` leaves the `Story` type, `COLUMNS`, `PRIORITIES`, parse, serialize, `storyIssues`, `applyBulk`, and story search in a single change. A half-removal would leave a type field that nothing fills, so the type, the loader and every reader change together, and `npm run typecheck` finds any reader that is left.

### Bulk edit keeps Epic and Feature only

With Priority gone, `applyBulk` takes `{ epic, feature }`. The "No change" sentinel `KEEP` in `StoriesBulkBar.tsx` existed only for the Priority dropdown (empty meant "clear"), so it is removed too. Epic and Feature already treat an empty value as "no change".

### Proposal input: Priority becomes an unknown key

The proposal writer already rejects unknown keys, and it did so before the special "Priority is not accepted" rule. Removing the special rule makes `priority` fail as an unknown key. The outcome for a caller is the same (the item is rejected), only the message changes. No code is added to handle it.

### Old scenario names stay in the delta specs

`openspec validate` refuses a MODIFIED requirement that omits a scenario the current spec has, by name. Four scenarios that describe Priority behavior ("Priority is optional", "Priority value not in the list", "Set priority only", "Clear priority") therefore stay in the deltas with new bodies that state the new behavior (no control, value dropped). They are accurate, if oddly named, and a later change can rename them once the Priority wording is no longer worth keeping.

### Regenerate the skill copies, never hand-edit them

The apply step edits `viewer/shared/`, then runs the sync script so the `toolkit/skills/*/lib/` copies match. The toolkit tests and `viewer/test/` then run against the same logic.

## Risks / Trade-offs

- [Old Priority values are lost the first time a file is opened] → The user accepted this because the field is unused. There is no portal backup, so the apply step reminds the user in its summary to keep a copy of the data folder first if any value matters.
- [A skill reads a file that still has the column, because it never went through the portal] → The skill copies of the loader drop the column the same way when they parse, so review and propose behave identically. They only read, so the file on disk keeps the column until the portal saves it.
- [A leftover reference to `priority` in a rarely used path (a test fixture, a sample stage CSV) fails a test or a skill check] → The apply step ends with a search for `priorit` outside `openspec/changes/archive/`, and the final task runs the whole viewer and toolkit test suites.
- [Docs drift] → The wiki pages that name Priority are updated in the same change, and `python scripts/check_docs.py` runs after.
