# Tasks

## 1. Linter with the zone rules

- [x] 1.1 In `viewer/package.json`, alias `typescript` to `npm:@typescript/typescript6@6.0.2`, add the native compiler as `@typescript/native` (`npm:typescript@7.0.2`), add `eslint@10`, `typescript-eslint`, `eslint-plugin-boundaries` and `eslint-import-resolver-typescript` as dev dependencies, and point the `typecheck` script at the native compiler; verify `npm ci` succeeds and `npm run typecheck` still passes for all three configs (if both packages claim the `tsc` binary, call the native one by its path, as design.md says)
- [x] 1.2 Add `viewer/eslint.config.mjs` with the element descriptors and `boundaries/dependencies` policies for the zone rules and the three frontend rules (start from the spike config in `.scratch/linter-spike/eslint.config.mjs`), turn on `boundaries/no-unknown-files` for the four zone folders, and add the `lint` script (`cd .. && eslint -c viewer/eslint.config.mjs viewer toolkit`); verify `npm run lint` reports no zone breach on the current code and no unknown file
- [x] 1.3 Add `viewer/test/lint/zones.test.ts`, which runs the ESLint Node API on supplied text under real zone paths: one case per breach the old test covered (alias and relative forms) must fail with `boundaries/dependencies`, and the allowed imports must pass, all naming files that exist; verify `node --test viewer/test/lint/zones.test.ts` passes, and that it fails when one policy in the config is removed

## 2. General lint rules

- [x] 2.1 Add `typescript-eslint` recommended (no type information), `eslint-plugin-react-hooks` for `viewer/frontend/`, and the unused-variable and unused-import rules to the config, then run `npm run lint` and list what it reports; verify the list is in the task report
- [x] 2.2 Fix each real problem the run reports (including the stray `react-hooks/exhaustive-deps` comment in `viewer/frontend/src/tools/backlog/features/lexicon/LexiconTab.tsx`), and turn a rule that reports only noise off in the config with a comment that says why; verify `npm run lint` exits 0, and `npm run typecheck`, `npm run build` and `npm test` still pass

## 3. Remove the old zones test

- [x] 3.1 Delete `viewer/test/zones.test.ts`; verify `npm test` passes, that `npm run lint` and the guard test from 1.3 cover each case the old file covered, and that no file still names `zones.test.ts` except the docs updated in group 5 (`grep` for it)

## 4. CI workflow

- [x] 4.1 Add `.github/workflows/ci.yml` with the triggers, permissions and the two jobs from design.md (viewer: `npm ci`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm test`; toolkit: install `toolkit/requirements.txt`, `python check_toolkit.py`, `python -m pytest`, `node --test` on the story tests); verify the YAML parses, and that each command in the file is the one CLAUDE.md names for that check
- [x] 4.2 Run each CI command locally in a fresh LF checkout of the branch under `.scratch/` and fix any failure that would also fail on Linux (line endings, path separators); verify every command exits 0 there

## 5. Docs

- [x] 5.1 Update CLAUDE.md (Commands: the `lint` script and the TypeScript alias, Zones: the linter now enforces them and the plugin config is where the rules live) and the wiki pages `Logic-Layer.md`, `Portal.md` and `Workflow.md` (replace each mention of `zones.test.ts`, note the alias as temporary until TypeScript 7.1, add the CI checks and the branch-protection step); verify `python scripts/check_docs.py` passes

## 6. Integration check

- [x] 6.1 Run the project's own test commands for the whole change and fix any failure they show: `cd viewer; npm run lint; npm run typecheck; npm run build; npm test`, then `cd ../toolkit; python check_toolkit.py; python -m pytest; node --test <abs>/toolkit/tests/story/*.test.mjs`, then `python scripts/check_docs.py` from the repo root; verify every command exits 0

## Workflow follow-up

- The repo owner switches on branch protection for `main` in GitHub and marks the `ci` jobs as required; until then CI reports a failure but does not block a merge.
- Remove `.scratch/linter-spike/` once task 1.2 has copied its config.
- Archive the change after review, and then archive or close `add-path-aliases`, which is finished and still open.
