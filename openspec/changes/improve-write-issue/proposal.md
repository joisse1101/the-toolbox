## Why

`/jois-git:write-issue` treated a description about the command itself as a task: it edited the
command's files and spec instead of writing an issue, then created an issue covering only part of the
list (#15). Its first real run also showed avoidable friction: a typed confirmation word, a required
Alternatives Considered section, a question round for sections that could be drafted, and a plain-text
URL at the end (#16). Both change the same file and the same spec requirements, so they ship together.

## What Changes

- User text is issue content: everything the user writes is the content of one issue and never
  instructions to the command, even when it describes the command, the repository or a file. One issue
  holds everything the user listed (#15).
- "Never edit code" becomes "never create or modify any file in the repository, whatever its type". The
  only file the command writes is the temporary body file outside the repository (#15).
- The duplicate search runs right after the host check, from the terms of the user's description, and
  re-runs after a revision only when the subject or summary changed (#16 item 5).
- A required section with no user content is drafted from the user's words, the conversation and the
  code, shown at confirmation as drafted, and never marked in the posted body; it is asked about only
  when nothing supports a draft. Gap questions come as a numbered list with a proposed draft per
  question (#16 items 3, 4).
- Alternatives Considered is optional in the feature template (#16 item 2).
- For a bug or feature the command reads the files the request points at with Read, Glob and Grep; it
  still never edits. Text read this way is subject to the secret scan (#16 item 6).
- Confirmation is an `AskUserQuestion` ("Create issue" / "Change something") instead of a typed word;
  free text such as "looks good" creates nothing (#16 item 7). The dialog is self-contained: the
  question carries the title and drafted sections and the preview of "Create issue" carries the whole
  body, because the dialog can hide earlier text in the same turn.
- Grounding is a duty: before drafting a required section, the command reads the files or folders the
  request points at, so drafts fit the existing code; with nothing to read it says the draft is thin.
- Template lookup uses Glob, not `ls`; the body-file path is quoted in the CLI call; the title is at most
  70 characters, a hard limit (#16 items 8, 9, 10).
- The report after creation is a markdown link `[#N](url)` with a one-line summary of the title (#16
  item 1).
- Command version 1.1.0 becomes 1.2.0; `allowed-tools` gains `AskUserQuestion`, `Read`, `Glob`, `Grep`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `toolkit-write-issue`: new requirement that user text is issue content and that no repository file is
  modified; changed requirements for the feature template, missing required content, duplicate search,
  confirmation, body passed from a file, conventional issue title and the creation report.

## Impact

- `toolkit/commands/jois-git/write-issue.md` (steps, rules, templates, frontmatter).
- `openspec/specs/toolkit-write-issue/spec.md` through the delta spec.
- `toolkit/README.md` (the write-issue paragraph).
- `toolkit/check_toolkit.py` checks versions and frontmatter only, so the version bump must pass it.
- The commit-hygiene rule is unchanged: commits still need the typed word.
