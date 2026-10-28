# Proposal

## Why

The toolkit can open pull requests (`/jois-git:write-pr`) but has nothing for issues. Writing a good
issue by hand means remembering the sections each kind of report needs, and the repos the team works
in are on GitHub or GitLab, so the right CLI differs per repo. An issue is public and hard to undo, so
it needs the same confirmation step the PR commands have.

## What Changes

- Add a manual-only command `/jois-git:write-issue`, the single file
  `toolkit/commands/jois-git/write-issue.md`, that drafts an issue from the conversation or from what
  the user says, shows it, and creates it only after the user types a confirmation word.
- Detect the host from the `origin` remote: GitHub uses `gh`, GitLab uses `glab`, and a host it cannot
  tell asks the user once.
- Ship three templates, chosen from the user's description: **bug**, **feature** and **task**. Each has
  required sections and optional sections; an optional section with no content is left out, heading
  included, and nothing is invented to fill one.
- Prefer the repository's own issue template for the matching type when one exists, and fall back to
  the toolkit's.
- Search for existing similar issues before creating, and scan the Screenshots / Logs content for
  secrets before showing the draft.
- Pass the body to the CLI from a file, never inline in a shell command.
- Document the command in `toolkit/README.md`.

No labels, assignees or milestones in this version.

## Capabilities

### New Capabilities
- `toolkit-write-issue`: the `/jois-git:write-issue` command: host detection, the bug, feature and task
  templates, omission of empty optional sections, duplicate search, secret scan, and confirmation
  before anything is published.

### Modified Capabilities

None. `toolkit-skills` already requires every command to live under `toolkit/commands/` and the
installer to copy it; a new file there needs no change to those requirements.

## Impact

- New file `toolkit/commands/jois-git/write-issue.md`.
- `toolkit/README.md`: a short entry next to `write-pr` and `update-pr`.
- `toolkit/check_toolkit.py` already checks that every command carries `disable-model-invocation: true`,
  so the new file is covered without a change to the checker.
- No change to the planner, the portal or the installer. `gh` is already assumed by the PR commands;
  `glab` becomes an optional dependency, needed only for GitLab repos.
