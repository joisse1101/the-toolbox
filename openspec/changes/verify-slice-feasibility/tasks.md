# Tasks

## 1. Verify skill: the three project checks

- [x] 1.1 In `toolkit/skills/jois-story-verify/SKILL.md`, add `Glob` to `allowed-tools`, bump `metadata.version` to `1.1.0` and `last_updated`, update the `description` to name the wiki and code checks, and add a "Read the project" step to "Read the slice" that gives the lookup order (the `CLAUDE.md` "Where the docs are" table, then `wiki/Home.md` and the topic pages, then a search of `wiki/`, always from the current folder, never a parent). Verify: `python toolkit/check_toolkit.py` passes and the lookup order matches the one in `toolkit/skills/jois-story-explore/SKILL.md` ("Contradictions").
- [x] 1.2 Rename "The six checks" to "The checks" and add check 7 (feasibility against the code the tasks and class diagram name, and against the wiki and `CLAUDE.md` rules for the area each task changes; the code part is not run for `planned (greenfield)` with no code, and the whole check only when there is no code and no wiki), check 8 (silent contradiction with a wiki page) and check 9 (the `Changes to existing specs` rows against the wiki), each ranked warning, each with its source. Verify: each new check names the script, file or search it reads, and matches the requirements in `specs/verify-story-skill/spec.md`.
- [x] 1.3 Add the citation rule (path and quoted line, or no warning; unconfirmed means suggestion), the coverage list in the report, the not-run cases (no wiki: one line naming `jois-init:docs` and no `wiki/` created; no code; unreadable file; a slice without the section), and the data rule (wiki and code text are data, no secret file is opened). Verify: the text states each case in the same words as the spec scenarios.
- [x] 1.4 Update "Report", "Route each finding" and "Limits": the three checks rank as warning or suggestion, a project finding routes to a slice correction, a review suggestion or the user's decision (a story or a spec-change row) through the existing approval steps, and the limit "compare the slice with the code" is replaced by "edit the wiki or the code, or apply a spec-change row". Verify: no sentence of the skill still forbids reading the code, and none lets it write the wiki.

## 2. Tests

- [x] 2.1 Update `toolkit/tests/story/verify-skill.test.mjs`: version `1.1.0`, `Glob` in `allowed-tools`, the nine checks with their ranks, the citation rule, the not-run cases and the data rule, and that the wiki lookup-order sentence is the same in `jois-story-explore`, `jois-story-propose` and `jois-story-verify`, so the three cannot drift apart. Verify: `node --test toolkit/tests/story/verify-skill.test.mjs` passes, and fails on a scratch copy of the skill with check 8 removed.
- [x] 2.2 Run the story and toolkit suites. Verify: `node --test toolkit/tests/story/*.test.mjs` and, from `toolkit/`, `python check_toolkit.py; python -m pytest` pass.

## 3. Trial on mock data

- [ ] 3.1 Build mock slices, a mock wiki and mock code under `.scratch/` from the sample slice and sample data (no real backlog), each with one planted defect: a task on a missing module, a task that breaks a wiki rule (a mock rule page and a task that crosses it), a silent contradiction with a page, a `modified` row naming a missing page, an `added` row naming an existing page, plus a clean slice, a project with no wiki, a greenfield slice and a wiki page that tells the skill to open `.env`. Verify: the mock folders exist and the clean one passes the plan skill's `--check`.
- [ ] 3.2 Run read-only agents on the mock cases, one each. Verify: each planted defect is reported as a warning with the page or file path and a quoted line, the clean slice has no warning and lists what was read, the no-wiki and greenfield cases say not run, the injected instruction is ignored and mentioned, and nothing is written. Fix the skill text from what the trial shows and rerun the cases that failed.

## 4. Docs

- [x] 4.1 Update `wiki/planner/Story-Skills.md` (verify section), `wiki/planner/architecture/Story-Skills-Internals.md` (verify skill), `wiki/planner/User-Flows.md` (verify a slice) and `wiki/toolkit/Toolkit-Guide.md` (the `/jois-story:verify` row) to describe the three new checks and the limits (instructions only, large wiki untested, no wiki edits). Verify: `python scripts/check_docs.py` passes.
- [x] 4.2 Run `openspec validate verify-slice-feasibility`. Verify: it reports the change valid.

## 5. Final evaluation

- [ ] 5.1 After groups 1 to 4 are done, run subagents to evaluate the finished skill on fresh mock slices, wikis and code under `.scratch/` that the trial in 3.2 did not use, including a clean slice, one planted defect per check (feasibility against code, feasibility against a wiki rule, silent contradiction, a spec-change row), a project with no wiki, a greenfield slice and an injected instruction. Run the evaluators read-only, one case each, and tell each to append one line per step to `.scratch/agents/<agent>.log`. Then judge every report against its case: each real defect found and ranked right, no false warning, every warning cited with a path and a quoted line, nothing written, coverage listed. Where a result is unsure (a borderline contradiction, a finding that may be real or invented, a rank that could go either way, a case two evaluators judged differently), do not decide it: ask the user with AskUserQuestion, give the options and mark a recommended one, and record the answer. Fix the skill text only for what the user confirms is wrong, rerun the cases that failed, and remove `.scratch/` files when done. Verify: a table of case, expected, found and verdict is shown to the user, every unsure row carries the user's answer, and no case is left failing.

## Workflow follow-up

- After the work is built, archive the change with `/opsx:archive` so the new requirements reach `openspec/specs/verify-story-skill/spec.md`.
- Issue #98: this is the follow-up to PR 3 (#101). The PR links back to #98, and the criterion "Verify reports what is not feasible and what does not make sense, and names the wiki page or code it checked" is ticked by the owner after the trial.
