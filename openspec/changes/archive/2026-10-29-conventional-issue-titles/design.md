## Context

`write-issue.md` is a single self-contained file (spec: "Manual-only single-file command"). Step 5
says only "Write a title of one plain line"; step 9 requires a title without quotes or `$` because the
title is passed inline to `gh issue create --title "<title>"`.

## Decisions

- **Mirror the commit rule.** Shape and subject rules (lowercase, imperative, no trailing period) match
  the user's commit hygiene rule, so commits and issues read alike.
- **Carry the type list in the file.** The command must work when copied by hand, so the eleven types
  are listed in `write-issue.md` rather than referenced from the commit rule.
- **Default type from the issue type.** Step 2 already picks bug, feature or task; step 5 maps it to
  `fix`, `feat`, `chore`. The user can override by naming another type or by the description clearly
  fitting one (for example docs).
- **Scope optional, never invented.** Matches "never invent content"; a scope appears only when the
  user names it or the description clearly points to one area.
- **Search by subject.** Step 7 searches the subject's key terms; `feat(toolkit):` would only add
  noise.
- **Shell safety unchanged.** `(`, `)` and `:` are safe inside the double-quoted `--title` argument;
  the existing no-quotes-no-`$` rule stays in step 9.

## Risks

- The title is lowercase, so a proper noun or acronym loses its case. Accepted, as for commit
  subjects.
- A repository with its own title convention is not detected; out of scope.
