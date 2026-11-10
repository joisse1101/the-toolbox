# Proposal

## Why

A slice that is built and validated still lives only in the planner data, so the code base's wiki never learns what was added or why it was designed that way. Nothing applies the "Changes to existing specs" rows that PR 2 added, so a story that contradicts a wiki page leaves the page wrong. This is PR 8 of issue #98 (the stage `jois-code archive`, from #73).

## What Changes

- Add the command `/jois-code:archive slice <backlog>/<slice>`. It folds a finished slice into the existing topic pages of the project's `wiki/`, the way `opsx:archive` applies delta specs: the slice's stories, flows, diagrams, contracts and design decisions go into the pages of the topic they belong to. A password-reset slice extends the authentication page and does not get a page of its own.
- A new page is created only when no topic page exists for the area. It is named for the topic, not for the slice.
- Archive proposes which page each part of the slice goes to, and the user approves. It reads the routing table in `CLAUDE.md` and `wiki/Home.md`, and uses the slice's spec-change rows as the first part of the map. It shows the whole plan, then every diff, before it writes anything.
- Archive applies the spec-change rows (`added`, `modified`, `removed`) to the wiki pages they name, with each diff shown first.
- Archive refuses a slice that is not ready: a stale or ambiguous slice, an unticked task, a `TBC` design decision, an open clarification question, or a latest full `validation.md` that is not `Validated: yes` at the current commit. It does not ask whether the slice was built or planned, because it only accepts a built one.
- Archive asks the user whether `jois-code review` was run and records the answer. It cannot check this itself, because review (PR 7) leaves no record.
- Each slice's contribution on a page sits in a section marked with the slice id, and the page's source table gets one row per slice (backlog, scope, date, story Titles with their hashes, the code repo's commit). A rerun replaces that slice's sections in place and adds no second copy.
- Any Mermaid diagram it merges into a page is parsed with the plan skill's `parse-mermaid.mjs` before its diff is shown.
- After a successful write it marks the slice folder as archived. It deletes nothing, because frozen stories and the "supersedes" rule need the slice to stay.
- Archive ends at the commit rule's confirmation-word stop, so the wiki edits travel in the same PR as the code (`write-pr` comes after). It never pushes.
- Correct the wording in `apply.md` that says the slice folder "is committed at archive", which is untracked and is never committed.
- Wiki: document the command in `Command-Details`, `Toolkit-Guide` and `Task-Recipes`, and the archive record in the plan skill's conventions.

Non-goals: decision records as their own files, a glossary page for lexicon terms, CI checks of symbols or of "verified at commit" (the staleness work in #73), and a record from `jois-code review`.

## Capabilities

### New Capabilities
- `code-archive`: the `/jois-code:archive` command, its readiness check, how it maps a slice onto wiki pages and applies spec-change rows, how it records each slice on a page and in the slice folder, and what it refuses to do.

### Modified Capabilities

None. The `code-validation` spec already defines the result file archive reads.

## Impact

- New file `toolkit/commands/jois-code/archive.md`, and tests under `toolkit/tests/` in the style of `test_validate_command.py`.
- A wording fix in `toolkit/commands/jois-code/apply.md`.
- Wiki pages under `wiki/toolkit/`, checked with `python scripts/check_docs.py`.
- `python toolkit/check_toolkit.py` picks the new command up by its glob and requires its version metadata and `disable-model-invocation: true`. The installer installs the `jois-code` folder as one unit and needs no change.
- The planner does not change. The plan skill's `parse-mermaid.mjs` gains a command line (it parses the `mermaid` fences of a file or of standard input and exits 1 on a failure), because it only exported a function and archive must run it before it shows a diff. Its existing function and the other plan scripts do not change.
- The command writes into the code repo's `wiki/`, so it must stay inside that folder, and it never reads or writes the planner's private data except the slice folder it was given.
