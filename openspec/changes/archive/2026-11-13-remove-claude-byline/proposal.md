# Proposal

## Why

The jois-git commands add a `Co-Authored-By: Claude` line to every commit and an attribution line to every PR description. The user does not want Claude named on commits or PRs in any project. Claude Code's own setting also adds a "Generated with Claude Code" footer to PR descriptions, and that footer should go too.

## What Changes

- Turn off Claude Code's attribution setting in `~/.claude/settings.json`, by hand.
- Remove the `Co-Authored-By` step from `toolkit/commands/jois-git/stage.md`.
- Remove the attribution-line step from `toolkit/commands/jois-git/write-pr.md`.
- Change the `jois-stage` and `toolkit-skills` requirements to match.

The settings change is made outside the repo, by the user, so it is not part of the apply work. The two commands are the only places in the repo that add the line, so editing them is enough. No git hook and no PR-body hook is added, because a hook would only strip a line that the commands no longer write.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `jois-stage`: the requirement that the typed confirmation word commits "with the attribution line given for the session" changes so the commit carries no attribution line.
- `toolkit-skills`: the PR body requirement that the body "SHALL end with the attribution line the environment requires" changes so the body carries no attribution line.

## Impact

- Files in this repo: `toolkit/commands/jois-git/stage.md`, `toolkit/commands/jois-git/write-pr.md`, and the spec delta files for `jois-stage` and `toolkit-skills`.
- Outside the repo: `~/.claude/settings.json` (set by the user, not by Claude).
- Commits and PRs made before the change keep their existing lines. Nothing is rewritten.
- Existing archived changes that mention attribution are history and are not edited.
