# Proposal

## Why

- `/jois-code:apply` stops after every group of tasks and waits for a confirmation word before it commits.
- On a feature branch a commit stays on the machine and is easy to undo, so the stop slows a long change down and protects nothing.
- On `main` or `master` the stop must stay.
- GitHub issue #63 asks for this.

## What Changes

- `/jois-code:apply` commits each finished group by itself when all of these hold:
  - The current branch is a named branch other than `main` or `master`.
  - A test run of the group's changes passes.
  - The group is one concern and nothing foreign is staged or edited.
- Otherwise it keeps today's behavior: stage, show the summary and message, name a confirmation word, end the turn.
- The command never pushes, on any branch.
- A new agent, `opsx-test-runner` (Haiku, no edit tools), runs the project's own test commands and reports the command, exit code and counts for each.
- The main session decides pass or fail from exit codes, not from the agent's summary.
- The `jois-git-commit-hygiene` rule gains one exception that names `/jois-code:apply` on an unprotected branch only.
- The rule's "no exception" wording in the specs is replaced by that one named exception.
- Command front matter: `allowed-tools` gains `git commit` and `git branch --show-current`, the description and version are updated.

## Capabilities

### New Capabilities

None. The test runner is documented in `toolkit-skills` next to `opsx-task-applier`.

### Modified Capabilities

- `toolkit-coding-standards`: the "Commits require explicit approval" requirement drops "There is no exception" and names the single exception.
- `toolkit-skills`: the apply requirement "Apply orchestrator stops for a commit after each group" gains the branch-based auto-commit and its fallback to asking. New requirements describe the `opsx-test-runner` agent and the checked auto-commit conditions.

## Impact

- `toolkit/commands/jois-code/apply.md` (new step, `allowed-tools`, description, version 1.1.0 to 1.2.0).
- `toolkit/agents/opsx-test-runner.md` (new).
- `toolkit/rules/jois-git-commit-hygiene.md` (exception, version 1.2.1 to 1.3.0).
- `openspec/specs/toolkit-coding-standards/spec.md` and `openspec/specs/toolkit-skills/spec.md` through delta specs.
- Installed copies: a user must re-run `Install-Toolkit.ps1` for the rule and the new agent, or an old installed rule still says "never commit" next to the new command.
- Known: the managed `operations.apply.guidance` in `openspec/config.yaml` also tells sessions to name a confirmation word. The applier agent never commits, so it is unaffected. Unchecked: whether `/jois-init:opsx` should reword it.
