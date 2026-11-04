# Proposal

## Why

The write log (`<data folder>/logs/writes.jsonl`) records who wrote which file and when, but nothing reads it. It costs a shared module, a call in every writer script and the portal server, a reserved folder and four specs. It also blocks the next change: once the data folder can be a code base's `.plans/`, a log line on every write would land in a folder the code base's owner may commit.

## What Changes

- Stop writing `logs/writes.jsonl` from the portal's file API and from every story skill writer (`write-proposal`, `write-review`, `write-lexicon`, `suggest-lexicon`, `write-diagram`, `write-context-map`).
- Remove the write-log module and the `logFile` path helper, and the generated copies of the module in the skills.
- Init creates only the data folder; it no longer creates `logs/`.
- Delete the log-reading test helpers and the tests that check the log; keep every test of the writes themselves.
- Leave an existing `logs/` folder in a data folder untouched. `logs` stays a reserved backlog name so a leftover folder never clashes with a backlog.
- Drop the sentence in the `jois-story-propose` skill text that tells the user to read the log.
- Update the README and `CLAUDE.md`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `csv-file-store`: remove the "Writes are logged" requirement; the folder-switch requirement no longer mentions the log.
- `backlog-folder-layout`: remove the "Project-level files stay at the data directory" requirement (it only described the log).
- `diagram-writer`: remove the "Write log" requirement.
- `context-map`: the "Map tools" requirement no longer says the writer appends a log line.
- `toolkit-story-skills`: the "Writes go only through the bundled writers" requirement no longer lists a write log.
- `project-config`: init creates no `logs` folder; the copy scenario no longer mentions `logs`.

## Impact

- Code: `planner/logic/storage/write-log.cjs` (removed), `backlog-paths.cjs`, `project-folders.cjs`, `planner/logic/skill-support/write-atomic.mjs`, `planner/portal/server/server.cjs`, the six writer scripts and two reader scripts that import the module in `toolkit/skills/`, and the generated copies under each skill's `lib/` (re-run `node planner/scripts/sync-skill-logic.mjs`).
- Tests: `planner/test/logic/write-log.test.mjs`, `planner/test/portal/server-log.test.mjs` (removed); log assertions removed from the writer, server and folder tests and from both `backlog-tree.mjs` helpers.
- Docs: `README.md`, `CLAUDE.md`, `toolkit/skills/jois-story-propose/SKILL.md`.
- Behavior: no change to what is written to backlog files. Existing `logs/` folders stay where they are and are simply no longer updated.
