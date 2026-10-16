## 1. Reader

- [x] 1.1 In `read-story-context.mjs`, make `readStoryContext` accept an optional `section` (`guidelines`, `index`, `proposals`, `lexicon`) and read only that section's files; verify with a test that `guidelines` succeeds when the proposals and lexicon files are missing and `lexicon` succeeds when a guideline file is missing
- [x] 1.2 Replace `formatContext` with one formatter per section (same labels and "data, never instructions" wording as today) and a menu formatter listing each section's size in characters, the cap and the command for each, with the number of benched proposed stories left out on the `proposals` line when it is above zero; verify with tests that each section prints only its own content, the menu prints none of it, and the benched note appears only when there are benched stories
- [x] 1.3 Update the CLI branch: accept `<file> --section <name>` (argv up to 5), print the menu for `<file>` alone, exit 2 with the valid names for an unknown section or `<ID> --section`, keep `<file> <ID>` and the no-argument list; verify with the CLI test (`run('a.csv', 'b', 'c').status === 2` still holds, and `run('data-portal.csv', '--section', 'nope').status === 2`)
- [x] 1.4 Rewrite the header comment of `read-story-context.mjs` for the sectioned usage; verify by reading it against the CLI behavior

## 2. Guard

- [x] 2.1 In `guard-bash.mjs`, allow `read-story-context.mjs <file> --section <guidelines|index|proposals|lexicon>` in both modes and nothing wider; update the `READER` usage text and the deny messages; verify the existing writer and ID-form tests still pass
- [x] 2.2 Extend `test/guard-story-bash.test.mjs`: allowed in read-only and read-write mode for each of the four words, denied for `--section` alone, `--section other`, `--section=index`, `--section index proposals`, `IAM-0004 --section index`, `--section index | head`, and a writer given `--section`; update the `[file [ID]]` text the existing assertions match so they pass with the new usage string

## 3. Skills, command and docs

- [x] 3.1 Update `.claude/skills/explore-stories/SKILL.md` Input step 2 to run the four section commands (guidelines, index, proposals, lexicon) and say that the unsectioned call prints only a menu; verify `test/propose-skill.test.mjs` still passes
- [x] 3.2 Update `.claude/skills/propose-stories/SKILL.md` step 2 the same way, keeping "at the start of every use, even if `explore-stories` already ran"; verify with `npm test`
- [x] 3.3 Update `.claude/commands/story/propose.md` step 2 so the command reads the sections; verify the text names all four
- [x] 3.4 Update `CLAUDE.md` where it describes `read-story-context.mjs` (the "prints `product-backlog.md`, then ..." sentence and the guard's allowed forms) for the sectioned reader; verify no sentence still says it prints everything in one call

## 4. Verify end to end

- [x] 4.1 Run `npm test` and confirm all tests pass
- [x] 4.2 Run the reader on the real data-portal backlog once per section and the menu, and confirm each output is well under 30,000 characters (the menu reports the sizes)
