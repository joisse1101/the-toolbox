## Context

`jois-comms-documents.md` (added in #35) defines the target. The toolkit has 7 existing rules (about 320 lines), 5 commands (about 930 lines), 1 agent (73 lines) and a 329-line README. The repo-only skills in `.claude/skills/` belong to the planner and are out of scope. See proposal.md for why.

## Goals / Non-Goals

**Goals:**
- Each toolkit markdown file follows the documents rule.
- Each PR is small enough to review for changed meaning.

**Non-Goals:**
- Changing what any rule, command or agent tells Claude to do.
- Shortening files for its own sake. Only the replies rule has a size budget.

## Decisions

### Stack of three PRs, each based on the one before
- Rules first: small and low risk, so the pattern is settled before the long files.
- Commands second: the largest, and the most behavior-sensitive. Split by file if a PR passes about 400 changed lines.
- Agent and README last, since the README describes the rules and commands and should match their final wording.
- Alternative: one PR. Rejected because a reviewer cannot check meaning across about 1,100 lines.

### Review each file against its old text
- For each file, compare the steps, hard stops and normative words before and after, and list any difference in the PR.
- Alternative: trust the rewrite. Rejected because commands are instructions Claude follows.

### Version bump per changed file
- Bump the patch version of a rewritten file, since its behavior is unchanged, and set `last_updated`.
- Alternative: bump the minor version. Rejected because nothing new is added.

## Risks / Trade-offs

- [A rewrite weakens a hard stop] → Compare old and new text per file, and keep the confirmation-word and end-turn lines word for word where they are normative.
- [A PR in the stack gets stale when an earlier one changes in review] → Rebase it onto its base and push with `--force-with-lease`, as the write-pr summary lists.
- [Longer files from added headers] → Accept it for commands and the README; keep the unscoped and code rules about the same length.

## Open Questions

- None that change the specs or tasks.
