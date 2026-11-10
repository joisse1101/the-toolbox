# Design

## Context

See proposal.md for why. Archive is the last stage that touches the slice, and the only one that writes to the wiki. It is a command like `apply.md` and `validate.md` (`toolkit/commands/jois-code/archive.md`), with a markdown test file in the style of `toolkit/tests/test_validate_command.py`.

What it can rely on already exists:
- `read-diagrams.mjs <backlog> --slice <slice>` reports a stale, missing or ambiguous slice and repairs a shifted story ID.
- `tasks.md` has ticked checkboxes and the slice's `validation.md` has a four-line header (`Run kind`, `Date`, `Tested commit`, `Validated`).
- `UC-<slice>.md` has the sections of the plan skill's conventions, including `## Changes to existing specs` (rows of `Change`, `Wiki page`, `What changes`, `Reason`, with no status column).
- `parse-mermaid.mjs` parses a Mermaid diagram.
- `scripts/check_docs.py` checks the wiki, and `CLAUDE.md` holds the routing table.

Constraints: the slice folder is untracked by git, the wiki is human text, and merging prose is model work that cannot be checked by a script. A diff the user reads is therefore the real safeguard.

## Goals / Non-Goals

**Goals:**
- A wiki that reads by topic after archive, with no page named for a slice unless it is a new topic.
- Every write seen as a diff before it happens, and a rerun that does not duplicate.

**Non-Goals:**
- Splitting a long page, decision files, a glossary page, symbol checks and CI staleness checks (all left to #73's later parts).
- Any change to the plan skill's scripts other than the command line added to `parse-mermaid.mjs` (D7), the planner or the CSV data.
- Reading a record from `jois-code review`.

## Decisions

### D1. Fold into topic pages, not one page per slice
The wiki describes the system as it is, grouped by topic, and a slice is a change to it. A reader looks for "authentication", not for "password-reset". Alternatives: one page per slice (simple to write and to rerun, but the wiki becomes a list of changes), split pages by artifact (more files for `check_docs.py` to keep linked, and a harder target for PR 9's overlap search). A new page is created only for a new topic and is named for the topic.

### D2. Archive proposes the page map and the user approves it
Archive reads the routing table in `CLAUDE.md` and `wiki/Home.md`, then searches `wiki/` for the topic, and proposes a target for each part. The spec-change rows seed the map, because they already name pages. The plan skill is not changed to record targets, because that widens another skill, its checks and its conventions for a decision that is cheaper to make at archive time with the wiki open. The map is shown before any diff so a wrong target costs one reply and no write.

### D3. Archive accepts only a built and validated slice
It drops #73's "built or planned" question. A plan merged into a page about the system makes the wiki wrong. The readiness check is: current slice (stale check), every task ticked, no `TBC` decision, no open question (the same fields `jois-story-verify` reads), and `validation.md` with `Validated: yes` whose `Tested commit` equals `git rev-parse HEAD`. A partial run never counts, as the validate spec already says.

### D4. Review is the user's word
`jois-code review` (PR 7) prints and records nothing, so archive cannot check it. It asks once and writes the answer into the source row. When PR 7 leaves a record, the question can be replaced by a check.

### D5. Slice sections inside a page, marked by id
The content a slice adds to a page sits between two comment markers that carry the slice id (for example `<!-- archive:<backlog>/<slice>:start -->` and `:end`). A rerun replaces what is between them, so there is never a second copy. Edits made by spec-change rows to text outside the markers are shown as diffs and are not marked, because they change existing prose and are not a slice's own content. The source table at the end of a page has one row per slice, with the commit and the story Titles with their hashes from `source.json`. Archive copies hashes and never computes them.

### D6. Rows are applied as approved diffs
A `modified` row is a sentence, not an edit, so applying it is model work. Archive drafts the edit, shows the diff next to the row it came from, and writes only after approval. A row it cannot place (the page does not exist for `modified` or `removed`) is reported and skipped. Rows have no status column, so a rerun re-offers them as diffs and the user sees at once that the text already matches.

### D7. Diagrams are parsed before they are shown
The class diagram is merged into the topic's existing diagram when one exists, and added as a new block when none does. Each result goes through `parse-mermaid.mjs`, which gets a command line for this: `node parse-mermaid.mjs -` reads the text to be written from standard input, parses every `mermaid` fence (input with no fence is `0 diagrams, 0 failed`, and `--bare` parses the whole input as one diagram) and exits 1 on a failure or 2 when it cannot run. The command passes the text as a quoted here-document, so no scratch file is needed. A trial found that without a command line the script printed nothing and exited 0, so a broken diagram would have passed. A failure blocks the diff for that page, so a broken diagram is never offered for approval.

### D8. Writes are confined to `wiki/`
The command has no hook. A hook that was tried ran PowerShell with `$` variables inside a `powershell -Command` string, and if the harness runs that through a shell that expands `$` the hook fails to parse and blocks nothing; it was also a custom check on top of the harness's own permissions. The command's `allowed-tools` pre-approves `Write` and `Edit` only for `wiki/**` and `**/slices/*/ARCHIVED.md`, `git add wiki/*`, `git diff --name-only` and `git merge-base --is-ancestor`, and lists no `git commit`, `git push` or `gh`, so each of those asks the user. Refusing a push outright is the user's `permissions.deny`, which the installer never edits. The archived marker is a small file in the slice folder, `ARCHIVED.md`, with the date, the commit and the pages touched. Nothing in the slice is deleted, because frozen stories and the supersedes rule name stories of the slice.

### D9. Commit through the rule
Archive stages the wiki paths one by one, never the slice folder, runs `python scripts/check_docs.py` first, and stops at the confirmation word. It is not an apply flow, so the exception that lets apply commit does not cover it, and the OpenSpec guidance in `openspec/config.yaml` already says the same for `opsx:archive`.

## Risks / Trade-offs

- [A wrong merge of prose that a tired reader approves] → one concern per approval, the diff beside its source row, and the check script after.
- [A topic page that grows too long] → accepted for now. Splitting by sub-topic is a later change, not a slice-named page.
- [Review is not checked] → the answer is recorded, so a later reader can see it was the user's word.
- [Reruns re-offer spec-change rows] → a diff that is empty is shown as "already applied" and written as nothing.
- [Instructions planted in a wiki page or slice] → treated as data and mentioned, and the allow list limits what is written without a question.
- [The command is instructions only] → its tests check the text, and a mock-repo trial with subagents under `.scratch/` checks the behavior, as for validate. The permission prompts and a large wiki stay untested until a live run.

## Migration Plan

None. The command is new. `apply.md` gets a wording fix only. Rollback is deleting the command and its tests.
