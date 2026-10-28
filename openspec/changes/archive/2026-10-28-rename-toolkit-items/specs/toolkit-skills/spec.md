## MODIFIED Requirements

### Requirement: Rules source of truth
The repository SHALL keep every custom Claude Code rule under `toolkit/rules/`. Each entry directly
under it SHALL be a single `.md` file, optionally with `paths:` frontmatter limiting it to matching
files, and is the unit the installer acts on.

#### Scenario: Rule file is one unit
- **WHEN** `toolkit/rules/jois-code-java.md` exists
- **THEN** the installer SHALL treat `jois-code-java.md` as one rule item and copy that file

### Requirement: Commands stay out of the session context
Every command file under `toolkit/commands/`, including the `opsx` set, SHALL declare
`disable-model-invocation: true` in its frontmatter, so its description is not loaded into a new
session's skill listing while the user can still invoke it by name. Skills, including
`jois-code-standards`, SHALL NOT be given this flag by this requirement. The docs check SHALL fail and
name any command file without the flag.

#### Scenario: Command is hidden but runnable
- **WHEN** a new session starts with the commands installed
- **THEN** no command description SHALL appear in `/context`, and typing `/jois-git:stage` SHALL still run it

#### Scenario: Flag is missing
- **WHEN** a command file under `toolkit/commands/` lacks the flag
- **THEN** the docs check SHALL fail and name the file

#### Scenario: Skill stays discoverable
- **WHEN** a session starts with `jois-code-standards` installed
- **THEN** its description SHALL still be listed

### Requirement: Jois commands carry a version
Each command file under `toolkit/commands/jois-git/` SHALL declare `metadata.version` (semver) and
`metadata.last_updated` (a date) in its frontmatter, and the docs check SHALL fail and name a file
where either is missing or malformed. The generated `opsx` commands are exempt.

#### Scenario: Missing version
- **WHEN** `toolkit/commands/jois-git/stage.md` has no `metadata.version`
- **THEN** the docs check SHALL fail and name the file

#### Scenario: Opsx commands exempt
- **WHEN** `toolkit/commands/opsx/apply.md` has no `metadata.last_updated`
- **THEN** the docs check SHALL NOT report it for that reason

### Requirement: Manual-only PR skill
The toolkit SHALL include a command `jois-git:write-pr`, the single file
`toolkit/commands/jois-git/write-pr.md`, that opens GitHub pull requests for the commits on the current
branch. It SHALL declare `disable-model-invocation: true`, so it runs only when the user invokes it by
name and is not listed in the session context. The file SHALL carry the PR guidelines, the PR template
and the verification rules inside it and SHALL be complete when copied by hand. The toolkit SHALL NOT
also ship a `write-pr` skill. The command SHALL NOT use the default branch as the head of a PR. The
requirements below that say "the skill" apply to this command.

#### Scenario: Not offered unprompted
- **WHEN** a session starts with the command installed
- **THEN** its description SHALL NOT be loaded into the session context and Claude SHALL NOT start it on its own

#### Scenario: Refuses the default branch
- **WHEN** the command is invoked while on `main` and `main` has no commits beyond `origin/main`
- **THEN** it SHALL open no PR and SHALL say that there are no commits to open a PR for

#### Scenario: Default branch is never a PR head
- **WHEN** the command opens PRs from commits made on `main`
- **THEN** every PR head SHALL be a new branch and none SHALL be `main`

#### Scenario: Single entry point
- **WHEN** the toolkit is installed
- **THEN** `/jois-git:write-pr` SHALL exist and no `write-pr` skill SHALL be copied from the toolkit

### Requirement: The skill never merges
The command SHALL NOT merge a PR, enable auto-merge, or pass `--auto`. A hook declared in the
command's frontmatter SHALL block `gh pr merge` and the merge API endpoint from the moment the
command is invoked.

#### Scenario: Merge attempted after the skill is invoked
- **WHEN** a merge command is attempted in a session where `/jois-git:write-pr` has been invoked
- **THEN** the hook SHALL block it and the PR SHALL stay open

### Requirement: Manual-only PR update command
The toolkit SHALL include a command `jois-git:update-pr`, the single file
`toolkit/commands/jois-git/update-pr.md`, that updates the open PR of the current branch. It SHALL declare
`disable-model-invocation: true`, SHALL carry the PR body template, the ticking rules and the
verification rules inside it, and SHALL be complete when copied by hand. It SHALL find the PR with the
current branch as head. If no open PR exists it SHALL change nothing and SHALL tell the user to use
`/jois-git:write-pr`. It SHALL NOT merge a PR, enable auto-merge or pass `--auto`, and a hook in its
frontmatter SHALL block `gh pr merge` and the merge API endpoint from the moment it is invoked.

#### Scenario: Not offered unprompted
- **WHEN** a session starts with the command installed
- **THEN** its description SHALL NOT be loaded into the session context and Claude SHALL NOT start it on its own

#### Scenario: No open PR
- **WHEN** the command is invoked on a branch with no open PR
- **THEN** it SHALL push nothing, edit nothing and tell the user to use `/jois-git:write-pr`

#### Scenario: Merge attempted
- **WHEN** a merge command is attempted in a session where `/jois-git:update-pr` has been invoked
- **THEN** the hook SHALL block it and the PR SHALL stay open

### Requirement: Restack after the base PR merged
When the PR's base is a branch other than the default branch, the PR under it has merged and the base
branch still exists, the update command SHALL offer to restack: rebase the branch onto the remote
default branch from the old base with `git rebase --onto`, push with `--force-with-lease`, and retarget
the PR to the default branch with `gh pr edit --base`. It SHALL NOT delete the old base branch. On a
rebase conflict it SHALL abort the rebase, leave the branch as it was and report the conflict. If GitHub
already closed the PR because its base branch was deleted, it SHALL say that the PR cannot be
reopened and tell the user to use `/jois-git:write-pr`.

#### Scenario: Stacked PR after its base merged
- **WHEN** PR 32 is based on `feat/a`, PR 31 from `feat/a` has merged and `feat/a` still exists
- **THEN** the command SHALL propose rebasing `feat/b` onto `origin/main` from `feat/a`, a `--force-with-lease` push and retargeting PR 32 to `main`

#### Scenario: Base still open
- **WHEN** the PR's base branch has an open PR
- **THEN** the command SHALL NOT restack

#### Scenario: Rebase conflict
- **WHEN** the rebase stops on a conflict
- **THEN** the command SHALL abort the rebase, leave the branch unchanged and report the conflict

#### Scenario: Base branch deleted
- **WHEN** the PR is closed because its base branch was deleted
- **THEN** the command SHALL change nothing and tell the user to use `/jois-git:write-pr`

### Requirement: PR body is refreshed from the branch
The update command SHALL regenerate the body from the same template, ticking rules and verification
rules as `jois-git:write-pr`, from the commits the PR now holds, and SHALL keep the title unless the user
asks to change it or it no longer fits the commits. A verification bullet SHALL state no result its
source lacks. It SHALL tell the user when the live body has content that the new body drops.

#### Scenario: Commit added after the PR was opened
- **WHEN** the branch gained a commit after the PR was opened
- **THEN** the new body's Changes Made SHALL list that commit and the presentation SHALL show it in the diff

#### Scenario: Title kept
- **WHEN** the user did not ask for a new title and the existing title still fits the commits
- **THEN** the command SHALL NOT change the title

#### Scenario: Hand-written content in the live body
- **WHEN** the live body holds text that the template does not produce
- **THEN** the presentation SHALL name that text as dropped and the command SHALL keep it only if the user says so

### Requirement: Shared PR sections stay identical
The docs check SHALL fail and name both files when the "PR body template" or "Author Verification"
section of `toolkit/commands/jois-git/update-pr.md` differs from the same section of
`toolkit/commands/jois-git/write-pr.md`.

#### Scenario: Sections differ
- **WHEN** the "PR body template" section of `update-pr.md` differs from that of `write-pr.md`
- **THEN** the docs check SHALL fail and name both files

#### Scenario: Sections match
- **WHEN** both sections are identical in the two files
- **THEN** the docs check SHALL NOT report them
