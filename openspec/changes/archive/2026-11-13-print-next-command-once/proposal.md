## Why

After `/jois-code:apply` or `/jois-code:archive` runs, the command keeps printing its own slash command at the end of every later reply, even for unrelated work. Both command files say to print it "at every stop after the slice is settled". The command text stays in the conversation, so the model reads "every stop" as "every turn" and never switches it off.

## What Changes

- Each stage of the story-to-code flow prints the command of the next stage, once, as the last line of its final reply, and only when the run finished successfully. Plan prints the apply command, and apply prints the archive command (or the validate command first, when archive would refuse the slice). Archive has no next slash command, so it prints none.
- No stage prints a command during its run: not after a group, a question, a wait or an early stop, and never its own command.
- An early stop (a refusal, a stale slice, a failed check, an unanswered question) prints no command line. Its message says what to fix.
- `archive.md` drops the instruction to rerun by copying a printed line.
- `jois-story-plan` gains the one apply line at the end of a plan that was written, verified and frozen.
- **BREAKING**: the rerun line is gone. A user who wants to rerun a stage types the command again.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `toolkit-skills`: the apply command's "Full form printed at the end" scenario becomes "next stage printed once, at the end of a finished run".
- `code-archive`: archive's "Full form printed at the end" scenario is replaced by "no command line is printed".
- `plan-stories-skill`: a new requirement, plan prints the apply command once after a finished plan.

## Impact

- `toolkit/commands/jois-code/apply.md` and `archive.md` (wording and version bump), and `toolkit/skills/jois-story-plan/SKILL.md` (new closing line and version bump).
- `toolkit/tests/test_archive_command.py` and `toolkit/tests/story/plan-skill.test.mjs`, which pin the old sentences and the plan skill's version.
- `wiki/toolkit/Command-Details.md`, which says both commands print their own command at every stop.
- Installed copies of the skills and commands under `~/.claude` are not touched. The user reinstalls them with `Install-Toolkit.ps1` after the change ships.
