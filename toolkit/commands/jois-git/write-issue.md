---
name: "JOIS: Write Issue"
description: Draft a bug, feature or task issue from the team templates and create it on GitHub (gh) or GitLab (glab). Manual only; creates issues and nothing else.
disable-model-invocation: true
allowed-tools: Bash(git remote get-url:*), Bash(git rev-parse:*), Bash(gh repo view:*), Bash(gh issue list:*), Bash(gh issue create:*), Bash(glab repo view:*), Bash(glab issue list:*), Bash(glab issue create:*)
metadata:
  version: "1.1.0"
  last_updated: "2026-10-29"
---

# Write an issue

Turn what the user says, or what this conversation established, into one issue and create it on the
repository's host. The templates are in the sections below the steps.

## Never

- Never create anything before the user types the confirmation word (step 8).
- Never close, edit, label, assign or comment on an issue, and never set a milestone. If asked, decline;
  the user does it.
- Never put the issue body inline in a shell command. Pass it from a file (step 9).
- Never invent content for a section, and never write a placeholder such as `N/A` or `TBD`.
- Never run a command outside the allowed ones, and never edit code.

## Steps

1. **Host.** `git remote get-url origin`. A host of `github.com` uses `gh`; a host whose name contains
   `gitlab` uses `glab`; any other host, ask once whether `gh` or `glab` applies and end the turn. Never
   guess. Then run `gh repo view --json nameWithOwner -q .nameWithOwner` (or `glab repo view`) to
   confirm the CLI is installed and signed in for that host. If the command is not found or the call is
   refused, name the CLI, say whether it is missing or not signed in, and stop. Create nothing.
2. **Type.** Choose bug, feature or task from the user's description and say which. Ask only when the
   description fits more than one type, and end the turn.
3. **Template.** Look in `.github/ISSUE_TEMPLATE/` and `.gitlab/issue_templates/` for a template whose
   file name or front matter (`name`, `labels`) matches the type. Use it instead of the toolkit's
   template and say which file. For a YAML form, use its field labels as the section headings and say
   so. With no match, use the toolkit template for the type (Issue templates below).
4. **Gaps.** List every required section with no content from the user or the conversation. Ask for all
   of them together, in plain text, and end the turn. Continue from the reply. Never fill a required
   section yourself.
5. **Compose.** Fill the template from what the user gave. Leave out an optional section, heading
   included, when nothing was supplied for it. In Environment, list only entries that have a value.
   Write the title as one line in the commit form `type(scope): subject`:
   - The type defaults from the issue type: bug `fix`, feature `feat`, task `chore`. Use another type
     from feat, fix, refactor, perf, style, docs, test, build, ci, chore, revert when it fits better.
   - The `(scope)` is optional. Add one only when the user names it or the description clearly points to
     one area; never invent one.
   - The subject names the problem, request or work, in lowercase and imperative, with no trailing
     period. The whole title is lowercase.
6. **Scan.** Check the title and body, the Screenshots / Logs section above all, for secrets: tokens,
   API keys, private keys, passwords, connection strings with credentials and `.env` contents. On a
   hit, do not present. Name the line and ask for a redacted version, then end the turn. The scan
   is a first filter: the user still reads the whole body.
7. **Duplicates.** Search open issues for the key terms of the title's subject and the summary, not the type or scope:
   - `gh issue list --search "<terms>" --state open`
   - `glab issue list --search "<terms>"` (open issues by default)

   List each match with number, title and link. If there are matches, ask whether to continue and end
   the turn; carry on only if the user says to. With no match, go on.
8. **Present and stop.** Show the type, repository, template used, title and the complete body as it
   will be posted. Name a common confirmation word that differs from your previous prompt's and say:
   "Reply with <word> to create this issue, or tell me what to change." Then end the turn and call no
   tool. "Yes" or "looks good" is not the word; restate it. After a change request, revise, re-run
   steps 6 and 7 if the text changed, present again and name a new word.
9. **Create** only when the user's next message is the word. Write the body to a temporary file
   outside the repository with the file-writing tool: the session's scratch directory if it names one,
   otherwise the OS temp directory. Never write it from a shell command. Then run one of:
   - `gh issue create --title "<title>" --body-file <path>`
   - `glab issue create --title "<title>" --description-file <path> --yes`

   The title has no quotes or `$` in it; if it would, rephrase it and show the change.
10. **Report** the issue number and URL from the CLI output. If the call failed, show the error and
    create nothing more.

## Issue templates

Required sections are always present. Optional sections appear only with content. Keep the headings
exactly as written.

### Bug

Required: Summary, Steps to Reproduce, Expected Behavior, Actual Behavior.
Optional: Screenshots / Logs, Environment (OS, Browser, Version).

```markdown
### Summary
[A clear and concise description of what the issue is.]

### Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

### Expected Behavior
[What should have happened.]

### Actual Behavior
[What happened instead.]

### Screenshots / Logs
[Optional. Screenshots, error output or logs, with secrets removed.]

### Environment
[Optional. Only the entries that have a value.]
- OS:
- Browser:
- Version:
```

### Feature

Required: Summary, Motivation, Proposed Solution, Alternatives Considered, Acceptance Criteria.
Optional: Design / Visuals (Figma links, wireframes, UI screenshots), Technical Considerations /
Security (API breaking changes, schema migrations, data privacy impact).

```markdown
### Summary
[What the feature is, in a sentence or two.]

### Motivation
[The problem or need this solves, and for whom.]

### Proposed Solution
[How it should work.]

### Alternatives Considered
[Other approaches and why they were not chosen.]

### Acceptance Criteria
- [ ] [A checkable condition that means the feature is done.]

### Design / Visuals
[Optional.]

### Technical Considerations / Security
[Optional.]
```

### Task

Required: Summary, Background / Context, Scope, Definition of Done.
Optional: Testing & Verification (how the engineer or reviewer confirms the change worked without
regressions), Dependencies / Blockers (prerequisite PRs and external blockers, as links).

```markdown
### Summary
[What needs doing, in a sentence or two.]

### Background / Context
[Why now, and what the reader needs to know.]

### Scope
[What is in, and what is explicitly out.]

### Definition of Done
- [ ] [A checkable condition that means the task is finished.]

### Testing & Verification
[Optional.]

### Dependencies / Blockers
[Optional.]
```
