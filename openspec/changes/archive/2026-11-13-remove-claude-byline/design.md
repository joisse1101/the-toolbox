# Design

## Context

The byline is written in two places. Claude Code adds its own commit and PR attribution from a setting in `~/.claude/settings.json`. The repo's jois-git commands add a `Co-Authored-By` line to commit proposals (`toolkit/commands/jois-git/stage.md`, line 67) and an attribution line to PR bodies (`toolkit/commands/jois-git/write-pr.md`, line 100). The specs `jois-stage` and `toolkit-skills` describe both lines as required. See proposal.md, Why, for the motivation.

## Goals / Non-Goals

**Goals:**

- No commit or PR made from this repo's commands carries a Claude byline or the "Generated with Claude Code" footer.
- The commands and their specs say the same thing.

**Non-Goals:**

- No git hook and no PR-body hook. The two commands are the only sources of the line in the repo, so a hook would only strip text that is no longer written.
- No rewriting of commits or PRs that already have the line.
- No change to the archived changes that mention attribution.

## Decisions

**Turn off the setting, not a hook.** The setting is the one place Claude Code reads for its own output, and turning it off is a single edit the user makes once for all projects. A hook would need a script, a matcher and upkeep, and would cover less.

**Remove the lines at the source in the two commands.** The commands are the only repo code that writes the line, so removing the instruction stops it at the source. A later check (the tasks) confirms no other instruction adds it.

**Change the two specs with MODIFIED deltas.** Each requirement is copied whole and changed only where it names the attribution line. This keeps the archived spec readable and makes the change easy to review. Alternative considered: leave the specs alone and let them drift. Rejected, because the specs would then require a line the commands no longer write.

**The user edits `~/.claude/settings.json` by hand.** That file is outside the repo, and the user asked to do it personally. Claude does not write to it.

## Risks / Trade-offs

- **The exact setting key was recalled from memory, not checked against the installed version's docs.** Mitigation: the user checks the key against the Claude Code settings docs before editing, then makes a test commit and a test PR draft to confirm no byline appears.
- **The setting might not remove the "Generated with Claude Code" footer on every path.** Mitigation: the same test PR draft shows the footer or its absence. If it stays, the footer must be removed another way, and that is a new change.
- **Another instruction in the repo might add the line later.** Mitigation: the grep in tasks 1.1 and 1.2 checks the two files; a wider search is part of the final check.
