# Design

## Context

- See `proposal.md` for why the write log goes.
- One shared module, `planner/logic/storage/write-log.cjs`, does the logging.
  - `planner/logic/skill-support/write-atomic.mjs` calls it after each atomic write, and the story-plan scripts and `server.cjs` also import it.
  - The sync script copies it into each skill's `lib/`, so the skills carry generated copies.
- `writeAtomic(dir, file, text, writer, log)` takes `writer` and `log` only for the log.

## Goals / Non-Goals

**Goals:**
- No code path creates, reads or appends `logs/writes.jsonl`.
- Writes to backlog files behave exactly as before.

**Non-Goals:**
- Deleting a `logs/` folder a user already has. It is theirs.
- Adding any replacement audit trail.

## Decisions

### Remove the module, not switch it off
- Delete `write-log.cjs`, `logFile` and the log calls.
- A flag would leave dead code and a folder nobody can explain.

### Drop the unused arguments of `writeAtomic`
- Remove `writer` and `log` from `writeAtomic` and its callers.
- The signature is internal to the planner and the skill scripts.
- Alternative: keep the arguments and ignore them. Rejected: callers would keep building log data for nothing.

### Keep `logs` a reserved backlog name
- Data folders from earlier versions hold a `logs/` folder.
- Keeping the reservation means such a folder never collides with a backlog named `logs`.
- It costs one constant and no spec change.

### Init creates only the data folder
- The `logs/` subfolder is dropped from init.
- Copy needs no special case: it copies whatever the source holds, so a leftover `logs/` is copied like any folder.

## Risks / Trade-offs

- Users lose the answer to "who wrote this file last". → Accepted. The `jois-story-propose` text that pointed at the log is removed, and its stale-tab advice stays.
- A generated copy of `write-log.cjs` is left in a skill's `lib/`. → The sync script no longer copies it, and `planner/test/skill-sync.test.mjs` fails on any stale copy.
