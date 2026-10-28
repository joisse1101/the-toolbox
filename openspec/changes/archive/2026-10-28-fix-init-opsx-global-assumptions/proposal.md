# Proposal

## Why

`/jois-init:opsx` assumes OpenSpec's commands live in the project. In a project whose `/opsx:*` skills and commands are global, it plans an `openspec update` that may write project files nobody wants, and it edits the global `delivery` setting (every project on the machine) as routine setup. It then bundles these writes into one yes/no with OpenSpec jargon (issue #17).

## What Changes

- Remove the `delivery` step: the command no longer reads or sets the global `delivery`.
- Remove the `openspec update` step: the command no longer regenerates the `/opsx:*` commands.
- Turn the `workflows` step into a read-only check. It reports the value and, only when `apply` or `archive` is missing, says in plain words that the commit-stop guidance will not take effect, and offers to fix the global setting as its own optional question.
- Keep the merge of the guidance into `openspec/config.yaml` as the essential write, `openspec init` when `openspec/` is missing, and the commit-rule check.
- Ask for each write separately, in plain words: why it is needed and what it affects (project or every project on the machine).
- End with a one-line report, e.g. `OpenSpec 1.x | openspec/ present | workflows=ok | guidance: added | commit rule: found`.
- Bump the command's `metadata.version` and `metadata.last_updated`; update the README's "OpenSpec setup" section to match.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `toolkit-skills`: the "OpenSpec setup command" requirement drops the `delivery` and `openspec update` duties, makes the `workflows` check read-only with an optional fix, and adds the separate-asks and one-line report rules.

## Impact

- `toolkit/commands/jois-init/opsx.md` (steps, frontmatter version and date, description).
- `toolkit/README.md` ("OpenSpec setup" section).
- `openspec/specs/toolkit-skills/spec.md` through a delta spec.
- No installer or test code changes expected; `check_toolkit.py` only checks the frontmatter fields.
