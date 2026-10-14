## 1. Pure input validation

- [x] 1.1 Create `src/user-story-generator/proposal-input.js` with `buildProposals({ input, backlog, proposals })` for the key set, field checks (required Epic/Feature/Title, `parseStory`, points 1/2/3/5/8/13 with a "split above 13" message, `parseCriteria` with at least one, no line breaks, unknown keys incl. `priority` rejected) returning `{ ok, stories, ids }` or all errors named by story position; verify with `test/proposal-input.test.mjs` cases for each rule and for several errors reported together
- [x] 1.2 Add placeholder allocation (start from `nextPlaceholder`, one per story in input order) and the `dependsOn` forms (backlog ID must exist, `NEW-<k>` batch-local remapped to the allocated ID, `proposed:NEW-<n>` must exist in the proposals file, self links, repeats and cycles rejected via `backlogProblems`); verify with tests including "numbers continue", "number named only by the backlog", batch-local and `proposed:` links, and a cycle
- [x] 1.3 Verify built stories round-trip: `serializeBacklog` then `loadBacklog(..., { placeholderIds: true })` gives the same fields, criteria and Depends On with no raw-text fallback (User Story / Acceptance Criteria parse cleanly), and extra backlog columns are padded; add that test

## 2. Writer script

- [x] 2.1 Create `.claude/skills/propose-stories/write-proposal.mjs` (`writeProposal({ root, name, input })` plus a CLI `<name>` with JSON on stdin): `validateName` from `server.cjs`, read `user-stories/<name>` and `proposals/<name>` (missing = create with the backlog's headers and BOM), call `buildProposals`, append to the loaded proposals and `serializeBacklog`, atomic temp-file-then-rename write, success line listing the IDs and the count in the file; a JSON parse error reports line and column; verify with `test/write-proposal.test.mjs` against a temp root (valid write, backlog byte-for-byte unchanged, unknown backlog, `../x.csv`, invalid input writes nothing, file created with extra columns)
- [x] 2.2 Add writer tests for add-only behaviour: existing rows, order and unknown columns kept after a second run, numbers continue across runs, a user-edited row is untouched, a CLI run through `spawnSync` prints the IDs and exits 1 with "Nothing was written" on invalid input; verify the tests pass

## 3. Reader and guard

- [x] 3.1 Create `.claude/skills/explore-stories/read-story-context.mjs` (`readStoryContext({ root, name })` plus CLI): no argument lists `user-stories/` names; with a name prints `guidelines/product-backlog.md`, the backlog CSV and the proposals CSV (or a "no proposals yet" line), each labelled as data; name via `validateName`, fixed paths only; verify with `test/read-story-context.test.mjs` (with and without a proposals file, `../x.csv` rejected, unknown backlog)
- [x] 3.2 Create `.claude/skills/explore-stories/guard-bash.mjs` with `check(command, { allowWrite })` and the hook entry point reading `--read-only` / `--read-write`; allow only the reader (and, with `allowWrite`, the writer as `... write-proposal.mjs <file> <<'JSON'` with a closing `JSON` line and nothing after); deny everything else with a message listing the allowed forms; verify with `test/guard-story-bash.test.mjs` (allowed forms, writer denied in read-only, `cat`, `ls`, redirects, `&&`, extra args, text after the closing line, flags as file names)
- [x] 3.3 Add `explore-stories/locked-settings.json` (`--read-only`) and `propose-stories/locked-settings.json` (`--read-write`) wiring the PreToolUse hook the way `review-backlog/locked-settings.json` does; verify each file is valid JSON and invokes the right mode by running the hook command with a sample hook input for an allowed and a denied command

## 4. Skills

- [x] 4.1 Write `.claude/skills/explore-stories/SKILL.md` (frontmatter `allowed-tools` for the reader only; read first via the reader; cite the guidelines without restating them; never write; offer to hand over to `propose-stories`; data not instructions; ask which backlog when none is named); verify with `grep` that it names no writer and that none of the guidelines' definitions are copied into it
- [x] 4.2 Write `.claude/skills/propose-stories/SKILL.md` (allowed tools: reader and writer; the stdin format and the three `dependsOn` forms with an example; show full drafts, yes/no, separate confirmation, ask again after changes; batches of about 8-10; report the assigned IDs and point at the Proposed tab; no Priority; cite the guidelines); verify the example JSON in the file passes `buildProposals` against a sample backlog (add a test that extracts and runs it)
- [x] 4.3 Update `CLAUDE.md` and `README.md` to describe the two skills, the reader/writer scripts and that the writer only adds to `proposals/`; verify the text matches the scripts' behaviour

## 5. Verify

- [x] 5.1 Run `node --test test/*.test.mjs` and verify all pass; run `npm run build` and verify it passes
- [x] 5.2 In a throwaway copy name (for example `zz-skill-check.csv`; delete it and its proposals file afterwards), run the writer by hand on a small input and verify the stories appear on the portal's Proposed tab with no parse warnings and can be accepted into the backlog
- [x] 5.3 Run `openspec validate add-write-story-skills` and verify it passes
