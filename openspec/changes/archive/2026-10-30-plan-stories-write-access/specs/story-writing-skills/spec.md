## MODIFIED Requirements

### Requirement: Review command
The command `/story:review` SHALL audit, read-only, only what is under discussion: the stories shaped in the session (backlog or proposed), their dependencies in both directions, the lexicon terms they use or the session changed, and what the session wrote (proposal rows, review rows, lexicon entries and term suggestions). It SHALL re-read the context first, use `check_drafts` to validate drafts agreed but not yet written when that tool is available, and check at least: agreed drafts against what is written, `Avoid` words used in those stories, `Depends On` links to missing, benched or renumbered stories, size over the guidelines' cap, open Clarifications, stale review rows, field edits on a locked story without an `unlock` row, and suggestions still waiting to be applied in the portal. When `check_drafts` is not available (a read-only session) it SHALL skip that step, say so in one line, and carry on with the rest. It SHALL end with a checklist grouped by who acts (the user in the portal, the session via `/story:propose`, a decision needed), or state that everything is in sync. It SHALL NOT review stories outside that scope, only point to `review-backlog` for a wider check, and SHALL NOT write any file.

#### Scenario: Agreed edit not written
- **WHEN** the session agreed a change to a backlog story but no review row exists for it
- **THEN** the checklist lists it under the session's actions, to be written with `/story:propose`

#### Scenario: Suggestion waiting
- **WHEN** a written lexicon suggestion for a term the stories use is still open
- **THEN** the checklist lists it under the user's actions in the portal's Lexicon tab

#### Scenario: Problem outside the scope
- **WHEN** an unrelated story breaks a guideline
- **THEN** it is not listed; at most one line suggests `review-backlog`

#### Scenario: Read-only session
- **WHEN** the session has no `check_drafts` tool
- **THEN** the audit skips the draft check, says it did, and still reports the rest of the checklist

## ADDED Requirements

### Requirement: Writing needs the writer tools
`propose-stories` and `/story:propose` SHALL check, before reading the context or drafting anything, that `check_drafts` and the four writers (`write_proposals`, `write_lexicon`, `suggest_lexicon_change`, `write_review`) are among the session's tools. When one is missing they SHALL stop, say that the session is read-only and which tools are missing, point to the launchers that start a session with them (`shape-stories.ps1` and `plan-stories.ps1`), draft nothing and write nothing.

#### Scenario: Read-only session
- **WHEN** `propose-stories` is invoked in a session with no `check_drafts` or writers (such as an `explore-stories` session)
- **THEN** it stops at once, names the missing tools and the two launchers, and drafts nothing

#### Scenario: Writers present
- **WHEN** the session has `check_drafts` and the four writers, as `shape-stories` and `plan-stories` sessions do
- **THEN** the skill continues as before
