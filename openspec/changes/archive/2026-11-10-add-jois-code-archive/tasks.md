# Tasks

## 1. The command: form, readiness and review answer

- [x] 1.1 Create `toolkit/commands/jois-code/archive.md` with frontmatter (name, description, `allowed-tools`, `disable-model-invocation: true`, `metadata.version` and `last_updated`), the `slice <backlog>/<slice>` form, the refusal of any other argument, and the rules (data not instructions, no push, never stage the slice folder). Verify with `python toolkit/check_toolkit.py` and a test in `toolkit/tests/test_archive_command.py` that asserts the form and the refusal text.
- [x] 1.2 Add the readiness steps: find the slice with Glob and stop on more than one match, run `read-diagrams.mjs` and stop on `STALE`, `changed:`, `missing:`, `new:` or `ambiguous:`, check every task is ticked, no `TBC` decision and no open question, and read `validation.md` for `Validated: yes` at the current `git rev-parse HEAD`. Verify with tests asserting each stop condition, the partial-run rule and the pointers to `/jois-code:apply` and `/jois-code:validate`.
- [x] 1.3 Add the review question and its record in the source row. Verify with a test asserting the command asks, records the answer, and never claims a review the user did not state.

## 2. The command: mapping, rows, diagrams and writes

- [x] 2.1 Add the page-map steps: read the `CLAUDE.md` routing table and `wiki/Home.md`, search `wiki/` for each topic, seed the map from the spec-change rows, print the whole map and wait for approval before any diff, name a new page for its topic and never for the slice. Verify with tests asserting the lookup order, the approval before a diff, and the topic-not-slice naming rule.
- [x] 2.2 Add the spec-change step: draft each row's edit, show the diff beside the row, write only after approval, skip and report a row whose page does not exist for `modified` or `removed`, and say so when the section holds `None`. Verify with tests asserting each change word and the skip.
- [x] 2.3 Add the write step: slice sections between archive markers that carry the slice id, one source-table row per slice with the fields of the spec, hashes copied from `source.json`, replace in place on a rerun, parse each Mermaid diagram with `parse-mermaid.mjs` before showing its diff, and read each written page back. Verify with tests asserting the marker form, the row fields, the rerun rule and the parse-before-diff order.
- [x] 2.4 Confine the writes with `allowed-tools`, with no hook: `Write` and `Edit` only for `wiki/**` and `**/slices/*/ARCHIVED.md`, `git add wiki/*`, and nothing for `git commit`, `git push` or `gh`. Verify with tests on the frontmatter.

## 3. The command: finish, mark and commit

- [x] 3.1 Add the finish steps: run `python scripts/check_docs.py` and leave the slice unmarked when it fails, write `ARCHIVED.md` in the slice folder with the date, the commit and the pages touched, delete nothing, stage the wiki paths one by one and never the slice folder, stop at the commit rule's confirmation word, and end with the one-line count of pages added, replaced, unchanged and skipped. Verify with tests asserting each step and that `git push` is not in `allowed-tools`.
- [x] 3.2 Run the command as subagents on mock repos under `.scratch/` with a mock wiki and the sample slice, covering: a ready slice folded into an existing page, a new topic page, an unticked task, a stale validation commit, a partial run only, a broken merged diagram, a rerun, a planted instruction in a wiki page, and a path outside `wiki/`. Fix the command text from what they find and run the failing cases again. Verify by recording each case's result in the PR description and by `git status` showing nothing written outside `.scratch/`.

## 4. Docs and the apply wording

- [x] 4.1 Fix the sentence in `toolkit/commands/jois-code/apply.md` that says the slice folder "is committed at archive", and update the apply test that quotes it. Verify with `python -m pytest toolkit` from `toolkit/` passing.
- [x] 4.2 Document the command: a row in `wiki/toolkit/Toolkit-Guide.md`, its steps and refusals in `wiki/toolkit/Command-Details.md`, its place after validate and before `write-pr` in `wiki/toolkit/Task-Recipes.md`, and the archive marker in the plan skill's wiki page. Verify with `python scripts/check_docs.py` passing.
- [x] 4.3 Run the whole check and validate the change: `python toolkit/check_toolkit.py`, `python -m pytest` in `toolkit/`, `python scripts/check_docs.py` and `openspec validate add-jois-code-archive --strict` all pass.

## Workflow follow-up

- Review the PR with `jois-code review` once PR 7 ships, and tick PR 8 in issue #98 with a "Where it differs" note that lists the folded-page decision, the dropped "built or planned" question and the review answer.
- Archive the change with `/opsx:archive` after review, then correct #73, which still says `docs/wiki/` and a page per slice.
