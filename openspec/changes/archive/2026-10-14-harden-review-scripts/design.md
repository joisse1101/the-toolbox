## Context

See proposal.md for why. Current state:

- `write-review.mjs` reads findings as JSON on stdin, validates them (`validateFindings` in `src/user-story-generator/review.js`, which already names each problem "Finding N (ID Field)"), fills `Current`, merges statuses from the old review and rewrites `reviews/<name>` atomically (temp file + rename).
- `guard-bash.mjs` is the PreToolUse hook of the locked review session. It accepts exactly one `read-backlog.mjs [name]` or `write-review.mjs <name> <<'JSON' ... JSON`, nothing else, because auto-allowed read-only commands (`cat`, `ls`, `grep`) would otherwise leak through.
- The scripts import `src/*.js` (ESM syntax, no `type` in `package.json`), which is the source of the `MODULE_TYPELESS_PACKAGE_JSON` warning. `server.js` is CommonJS (`require`, `__dirname`, `module.exports`) and is loaded by both scripts through `createRequire` for `validateName`.
- The shell failure on large heredocs could not be reproduced or explained; the cause is unverified.

## Goals / Non-Goals

**Goals:**
- Let a review of any size be written as several small commands without weakening the write lock.
- Make a failed write easy to diagnose.
- Remove the Node warning without breaking the server.

**Non-Goals:**
- Finding the root cause of the heredoc failure. Small batches avoid it whatever it is.
- Changing the review CSV format, the portal, or the findings schema.
- Letting the skill read or write any other file (no file-path input).

## Decisions

**1. `--append` on stdin batches, not a file-path argument.** A path argument would need the skill to stage a file somewhere writable, which is exactly what the lock forbids, and would widen both the script's and the hook's argument rules. A flag keeps one fixed target and one fixed input channel. Alternative considered: a staging area inside `reviews/` that the script owns; rejected as a second write path to reason about.

**2. Each batch is validated alone, so groups cannot span batches.** Validation needs the whole group (NEW-n links, "all rows `confirm`", Title check). Rather than re-validating the accumulated file, reject an appended batch that reuses a Group name already in the file, and tell the skill to keep a split group inside one batch. Non-group findings are independent, so batching them is safe.

**3. First batch replaces; statuses are carried in a side file.** Without `--append` the run replaces the review, as today. That would lose old `applied`/`dismissed` statuses for the later batches, because the old file is already gone by then. So a non-append run writes the old rows whose status is not `open` to `reviews/<name>.decided` (a non-`.csv` file, so the file API never lists it and `reviews/*` is already git-ignored), merged over any earlier `.decided`. `--append` batches take statuses from that file with the same `mergeStatus` rule. Alternatives considered:
- Stage batches in a `.pending` file and publish with a final `--finish` command: cleaner (the portal never sees a partial review) but adds a third mode and a step the skill can forget, which leaves the old review in place without any message.
- Let the first batch keep all old rows: changes the existing "a re-run replaces" behaviour.

**4. Append reads the current review file, not a cached copy.** An append is: parse `reviews/<name>` (empty if missing), validate the batch, `fillCurrent`, merge statuses from `.decided`, write `existing + batch` atomically. If a batch is rejected, nothing is written, so earlier batches stay and the batch can be fixed and resent.

**5. Error detail.** `JSON.parse` failures keep the engine's message (it includes the position on current Node) and the script adds the line and column computed from that position, plus a short excerpt of the text around it. Validation errors keep the existing "Finding N" naming; with batches, N is the position within the batch and the message says "in this batch". The hook's deny messages list the three allowed forms.

**6. Module setup: `"type": "module"` plus `server.cjs`.** Adding `"type": "module"` alone would break `server.js` (and `createRequire` of it). Renaming it to `server.cjs` keeps it CommonJS with no code change. All references move: `npm start`, `createRequire(.../server.cjs)` in both scripts, any test that imports it, `CLAUDE.md`, `README.md`, comments in `vite.config.mjs` and the user-facing hint in `src/shared/files.js` ("Is `node server.js` still running?"). Alternative: keep CommonJS everywhere by renaming the ESM `src` files; rejected, far more churn. Alternative: leave the warning; rejected, it is output clutter on every skill run.

## Risks / Trade-offs

- [Skill forgets `--append` on a later batch and replaces the review with only that batch] -> SKILL.md states the first batch is plain and the rest use `--append`; the success line prints the total row count so the loss is visible.
- [`.decided` goes stale or is left behind if a backlog is renamed or deleted] -> it is only read by `--append`, is overwritten and merged by the next non-append run, and is git-ignored; worst case a status is not restored.
- [Missed reference to `server.js` after the rename] -> grep for `server.js` in the task list, and run the full test suite plus `npm start` and a script run to confirm no warning.
- [Git history for `server.js`] -> use `git mv` so rename detection keeps blame.
