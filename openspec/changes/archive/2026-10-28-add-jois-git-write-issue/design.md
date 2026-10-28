# Design

## Context

`toolkit/commands/jois-git/write-pr.md` and `update-pr.md` are single-file, manual-only commands that
use `gh`, name a confirmation word before publishing, and pass bodies from a file. `write-issue`
follows the same shape. `check_toolkit.py` already requires `disable-model-invocation: true` on every
command and checks the version metadata. `toolkit-skills` still says skills live in `toolkit/skills/`,
which does not exist; commands are where this kind of tool went. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- One command file, complete when copied by hand, with the three templates inside it.
- The same publish discipline as `write-pr`: nothing outward-facing before a typed word.
- Work on GitHub and GitLab with no per-host branching in the user's workflow.

**Non-Goals:**
- Labels, assignees, milestones, closing, editing or commenting on issues.
- Sharing text with `write-pr`/`update-pr`. They share a PR body template that `check_toolkit.py`
  keeps in sync; issues have no such shared text, so the checker is not extended.
- A merge-blocking hook. There is nothing to merge; `allowed-tools` limits the shell commands instead.

## Decisions

**Command, not skill.** Creating an issue is public and hard to undo, and the PR commands made the same
choice with `disable-model-invocation: true`. The cost is invoking it by name. Alternative: a skill the
model may trigger on "file an issue for this"; rejected because an unprompted publish is the failure
mode the confirmation word exists to prevent.

**Host from `origin` URL.** `github.com` maps to `gh`; a host containing `gitlab` maps to `glab`;
anything else is asked once. Alternative: probe `gh auth status` and `glab auth status` for the host.
Rejected as the first step because it fails on a machine with only one CLI logged in and is slower;
it stays available as the fallback when asking.

**Confirmation word, same as `write-pr`.** Present type, repo, title and body as plain text, name a
common word different from the previous prompt, end the turn, create only on that word. Approval
phrases do not count.

**Body from a file.** Written with the file-writing tool to the session scratch directory (else the OS
temp directory), then passed to the CLI by file. The body is markdown with backticks, quotes and `$`;
inline quoting differs between PowerShell and bash and can alter the text after the user confirmed it.
No merge hook is needed, so the original reason in `write-pr` (merge words in a body tripping the hook)
does not apply.

**`allowed-tools` as the safety boundary.** Limited to `git remote get-url`, `git rev-parse`,
`gh repo view`, `gh issue list`, `gh issue create`, `glab repo view`, `glab issue list` and
`glab issue create`. This enforces "create only" without a hook.

**Repo template wins.** The repo's own `.github/ISSUE_TEMPLATE/` or `.gitlab/issue_templates/` file for
the type is used when present, since the maintainers wrote it for that repo. The toolkit templates are
the fallback. Matching a repo template to bug, feature or task is by file name and front matter
(`name`, `labels`); when no file maps to the type, the toolkit template is used.

**Omission over placeholders.** Empty optional sections disappear with their heading. Required gaps are
asked for once, together. This mirrors `write-pr`'s rule that verification is recorded, not invented.

**Duplicate search with the host CLI.** `gh issue list --search "<terms>" --state open` and
`glab issue list --search "<terms>"`; matches are listed and the user decides whether to continue.
Search terms come from the title and summary.

## Risks / Trade-offs

- [`glab` body input is unverified: whether `glab issue create` reads a file or stdin] → Settle it
  from `glab issue create --help` or the docs in the first task, before the command is written; if
  neither exists, use the form that reads the file without putting the body in the command text.
- [`glab` is not installed on the author's machine, so the GitLab path cannot be run here] → Verify
  flags from help output and docs; state in the README that GitLab is checked against the CLI docs.
- [Secret scan is pattern-based and can miss a secret] → The user still reads the full body before
  typing the word; the scan is a first filter, not a guarantee.
- [Host detection misreads a self-hosted GitHub Enterprise or a GitLab host without "gitlab" in its
  name] → Unrecognised hosts are asked, never guessed.
- [Repo template files vary widely (YAML forms, markdown)] → Use markdown templates' sections; for a
  YAML form, use its field labels as the section headings and say so.

## Open Questions

- Resolved (task 1.1, from docs.gitlab.com/cli, not run locally): `glab issue create --title "<t>"
  --description-file <path> --yes` reads the body from a file (`-` is stdin; `-d` is inline and `-d -`
  opens an editor). `glab issue list --search "<terms>"` lists open issues by default (`--closed` and
  `--all` change that), searching title and description; add `--output json` for parsing. `gh` uses
  `gh issue create --title "<t>" --body-file <path>` and `gh issue list --search "<terms>" --state open`.
