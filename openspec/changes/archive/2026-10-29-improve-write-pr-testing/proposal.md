## Why

`/jois-git:write-pr` and `/jois-git:update-pr` give every PR the full testing block and ask the
verification question for every group, even a chore that only touches config or docs and has nothing to
test. The suggested reviewer steps are also generic (the repository's documented test command), so a
reviewer of a bug fix is told to run the whole suite instead of how to confirm the fix. This is issue #21.

## What Changes

- A group needs no tests when its type is `chore`, `build`, `ci`, `docs` or `revert` and the model judges
  from the diff that no changed file alters behavior. Executable code, tests, migrations and files that
  instruct an agent or tool (prompts, skills, commands, hooks, workflows) count as behavior. Extensions
  such as `.md`, `.json` and `.yaml` are hints only, and there is no repository-specific path list. When
  unsure, the group keeps the testing sections.
- For such a group: omit the whole testing block (How Has This Been Tested?, Author Verification, How to
  Test This PR), skip the verification question in step 5, and write Summary as one sentence that leads
  with why. The body keeps Summary, Related Issues, Type of Change and Changes Made.
- The presentation step shows each group's classification and the reason, so the author can reply that a
  group needs tests after all.
- For every other group, How to Test This PR steps target what the group changes. Sources are the
  group's new tests, `tasks.md`, commit bodies and commands run in the conversation. A command seen run in
  the conversation may be a step even when no document states it, tagged `chat`.
- Apply the same changes to `update-pr`, whose "PR body template" and "Author Verification" sections must
  stay identical to `write-pr`'s.
- Bump `write-pr` to 2.4.0 and `update-pr` to 1.2.0, with `last_updated` 2026-10-29.

The two commands stay separate: merging them would widen one command's permissions and weaken the
no-force-push rule of `write-pr`, and belongs in its own change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `toolkit-skills`: "PR content follows the template" omits the testing block for a group that needs no
  tests and shortens its summary; "Author verification is recorded, not invented" is skipped for such a
  group; "Reviewer steps are grounded and sourced" targets the change and accepts conversation runs.
  "Shared PR sections stay identical" needs no change: it already covers the new text.

## Impact

- `toolkit/commands/jois-git/write-pr.md` (steps 5, 6 and 7, PR body template, ticking rules, Author
  Verification, version) and `toolkit/commands/jois-git/update-pr.md` (the same sections and its steps 5
  to 8, version).
- No change to `toolkit/check_toolkit.py`; its identical-sections check covers the new text. Installed
  copies update with `Install-Toolkit.ps1 -Force`.
