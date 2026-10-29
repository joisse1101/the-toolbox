## Why

The toolkit's own markdown does not follow the documents rule added in #35: long bullets with
several ideas, few headers, and terms used before they are defined. Files that Claude loads as
instructions are the hardest to read and the most costly to get wrong. This is the follow-up to
issue #23, "change C" in the exploration.

## What Changes

- Rewrite the toolkit's markdown to follow `jois-comms-documents.md`: purpose first, a header per
  topic, one idea per bullet, terms defined on first use, owner and date on next steps, and
  known, assumed and unchecked kept apart.
- Keep behavior as it is. Steps, hard stops, confirmation-word logic and every rule's meaning
  stay the same; only structure and wording change.
- Land it as a stack of PRs, each based on the one before:
  1. `docs/retrofit-rules`: the 7 existing rules (`jois-code-*`, `jois-git-commit-hygiene`).
  2. `docs/retrofit-commands`: the 5 commands (`write-pr`, `update-pr`, `write-issue`, `stage`,
     `jois-init/opsx`), split further if a PR passes about 400 changed lines.
  3. `docs/retrofit-agent-readme`: `agents/opsx-task-applier.md` and `toolkit/README.md`.
- Bump `metadata.version` and `last_updated` on each changed rule, command and agent.
- Not in this change: the repo-only skills in `.claude/skills/`, the planner's guidelines, and
  the OpenSpec specs.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `toolkit-communication-rules`: adds a requirement that the toolkit's own markdown follows the
  documents rule, and that a retrofit changes no behavior.

## Impact

- Edited: `toolkit/rules/*.md` (except the two comms rules), `toolkit/commands/**/*.md`,
  `toolkit/agents/opsx-task-applier.md`, `toolkit/README.md`.
- Risk: commands and agents are instructions that Claude follows, so rewording can change what
  Claude does. Each PR is reviewed for changed meaning, not only for style.
- `check_toolkit.py` and `python -m pytest` must pass on every PR in the stack.
- Installed users get the new wording on their next install.
