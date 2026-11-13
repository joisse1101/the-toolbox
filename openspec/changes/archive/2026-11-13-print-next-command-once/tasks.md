## 1. Apply prints the archive or validate command once

- [x] 1.1 In `toolkit/commands/jois-code/apply.md`, replace the sentence at the end of "Finding the slice" (print the full form "at every stop") with a closing rule: print nothing during the run, never print this command's own line, and print the next stage's line once, as the last line of the final reply of a finished run, never in a later reply. Verify: `Grep` for `at every stop` in `apply.md` finds nothing, and the new rule names the final reply and says "never in a later reply".
- [x] 1.2 In `apply.md` step 11 and step 2's "no unticked task" bullet, keep the validate-or-archive choice but print only the one command that applies, not the apply command. Verify: neither place prints `/jois-code:apply slice` as a line to copy.
- [x] 1.3 Raise `metadata.version` and `last_updated` in `apply.md`, and update `wiki/toolkit/Command-Details.md` where it says apply prints its command "at every stop". Verify: `python scripts/check_docs.py` passes.

## 2. Archive prints no command line

- [x] 2.1 In `toolkit/commands/jois-code/archive.md`, remove the print instructions: the sentence at the end of "Finding the slice", the Rules bullet "Every stop after step 1 ends with the line", the last sentence of step 3's stop line, the last two bullets of step 8d about the final line, and the Resuming instruction to copy the printed line. Say once in Rules that archive prints no slash command line. Verify: `Grep` for `/jois-code:archive slice` in `archive.md` finds no line that tells the model to print it.
- [x] 2.2 Raise `metadata.version` and `last_updated` in `archive.md`, and update the archive paragraph of `wiki/toolkit/Command-Details.md`. Verify: `python scripts/check_docs.py` passes.
- [x] 2.3 Update `toolkit/tests/test_archive_command.py`: replace `test_finding_section_never_names_its_command_and_ends_with_the_full_form_line` and `test_every_stop_after_the_slice_is_settled_prints_the_full_form` with tests that the file prints no command line and says so in Rules, and update the pinned version. Verify: `cd toolkit; python -m pytest tests/test_archive_command.py` passes.

## 3. Plan prints the apply command once

- [x] 3.1 In `toolkit/skills/jois-story-plan/SKILL.md`, add the closing line to "Ask whether to commit the plan files": after the answer, or after the freeze reply when the question does not apply, end the final reply with `/jois-code:apply slice <backlog>/<slice>` once, never at an early stop and never in a later reply. Raise `metadata.version` and `last_updated`. Verify: the new text is in the section and `Grep` finds the apply line only there.
- [x] 3.2 Update `toolkit/tests/story/plan-skill.test.mjs`: the pinned version, and a test for the closing line. Verify: `node --test toolkit/tests/story/plan-skill.test.mjs` passes.

## 4. Run the tests for the whole change

- [x] 4.1 Run the project's own test commands for the whole change and complete any fixes the failures need. Verify: `cd toolkit; python check_toolkit.py; python -m pytest` and `node --test <abs>/toolkit/tests/story/*.test.mjs` exit 0, and `python scripts/check_docs.py` exits 0.

## Workflow follow-up

- After the change ships, the user reinstalls the three items with `Install-Toolkit.ps1` (`-Command jois-code` and `-Skill jois-story-plan`), because the installed copies under `~/.claude` are not changed by this change.
- Optional live check in `.scratch/mock-app/`, as `CLAUDE.md` describes: run apply to the end, ask an unrelated question, and confirm no command line is printed.
