## ADDED Requirements
### Requirement: Propose skill and frozen stories
The toolkit SHALL contain a skill `jois-story-propose` at `toolkit/skills/jois-story-propose/SKILL.md` that turns agreed stories into proposed stories in `proposals/<backlog file name>`, applies agreed changes to proposed stories already there, turns agreed changes to stories already in the backlog into suggestions for the editor in `reviews/<backlog file name>`, adds new terms to the backlog's lexicon in `lexicons/<backlog file name>`, and turns agreed changes to terms already there (an edit, a rename or a delete) into suggestions in `lexicon-suggestions/<backlog file name>`. It SHALL read the context (with the context reader script, and the lexicon and proposals files with the reader's file-part form or ordinary file tools) at the start of every use, even when `jois-story-explore` already ran it in the same session, so that what it adds, patches or suggests builds on the files as they are now. It SHALL show, in one reply, the complete drafts (Epic, Feature, Title, User Story, Sprint points, Depends On, User Acceptance Criteria, Notes) of new stories; for each patch, the story it changes and the fields that change with their old and new values; for each edit to a backlog story, the story (ID and Title) and each field edit with its old and new value and its reason; for each added term, its fields; and for each change to an existing term (edit, rename or delete), the term and each field with its old and new value and the reason. Before it asks, it SHALL run each writer with `--check` on the new stories, edits and terms it is about to write, and fix any problem it reports with the user (showing the changed drafts whole) so that the question is asked only about drafts the writers will accept. It SHALL then ask one direct yes/no question covering everything shown, and write only after the user confirms in a separate message. An answer to a design question, or approval of the idea, SHALL NOT count as confirmation. After any change to the drafts, patches, edits or lexicon changes the skill SHALL ask again. The files it may write are `proposals/<backlog file name>`, only through the writer script described by the `story-proposal-writer` capability, `reviews/<backlog file name>`, only through the review writer in its `--append` form (see `backlog-review-suggestions`), `lexicons/<backlog file name>`, only through the writer described by the `lexicon-writer` capability (new terms only), and `lexicon-suggestions/<backlog file name>`, only through the script described by `lexicon-suggestions`; each is run with Bash, and the backlog CSV SHALL never be modified. Edits to backlog stories SHALL be written as review rows with `--append` only, so the rows already in the review are kept; they SHALL use the existing review Area values; and they SHALL NOT use `add-story` rows, because a new story always goes to the proposals. An edit to a frozen story SHALL NOT be written as a review row and SHALL NOT be accompanied by an `unlock` row: the skill SHALL tell the user that the story is frozen and that a change to it needs a superseding story (see `frozen-stories`), and SHALL write nothing for that edit. New terms SHALL be written directly to the lexicon, without a staging step, and SHALL be written first, so stories written in the same run can use a term defined in it. A change to a term that already exists SHALL only be suggested, never patched into the lexicon, and the draft SHALL say that the user applies it in the Lexicon tab. The writes SHALL be separate commands; when a later one is rejected the skill SHALL report what was written and fix only the rejected part, never running an earlier one again. After every write the skill SHALL read the same file back in the same turn (with the context reader script for reviews and lexicon suggestions, with its file-part form or ordinary file tools for the proposals and the lexicon) and compare it with what it sent (proposals: the IDs and the row count; lexicon: the terms; reviews and lexicon suggestions: the rows, by story), and SHALL call something written only when the read-back matches. It SHALL NOT repeat an earlier statement that something was written without such a read in the current turn. When the read-back does not match, the skill SHALL say so, say what is missing, and send again only the missing part: new stories already in the proposals are skipped by the writer, so a repeated proposals write is safe, and a missing term or review row is sent alone. It SHALL prefer a patch to adding a new story when the user wants to change an existing proposal. It SHALL cite the guidelines in its own `references/` folder for the story format, size and sprint points and SHALL NOT restate them.

The command `/jois-story:propose` SHALL follow the same skill without the yes/no step: it SHALL show the drafts, patches, edits and lexicon changes and then write them in the same turn, with the same writers and rules.

#### Scenario: Confirmation first
- **WHEN** the user has agreed on two stories but has not yet been asked to confirm the drafts
- **THEN** no file has been written and the skill asks "Write these to the proposals?" with the full drafts shown

#### Scenario: Confirmed
- **WHEN** the user answers yes to the question
- **THEN** the stories are in `proposals/<backlog>.csv`, the backlog CSV is byte-for-byte unchanged, and the reply names the IDs assigned and says they appear on the portal's Proposed tab

#### Scenario: Edited after the question
- **WHEN** the user asks for a different Title after the drafts were shown
- **THEN** the skill shows the changed drafts and asks again before writing

#### Scenario: Rejected input
- **WHEN** the writer rejects the stories
- **THEN** the skill reports the problems, fixes the drafts, shows the changed drafts and asks again; nothing was written by the rejected run

#### Scenario: Reader run first
- **WHEN** `jois-story-explore` read the context earlier in the session and the user then starts `jois-story-propose`
- **THEN** the skill reads the context again before drafting or patching anything

#### Scenario: Fix an existing proposal
- **WHEN** the user asks to change the points of `NEW-8` after it was written
- **THEN** the skill shows `NEW-8` with the points changing from the old to the new value, asks yes/no, and after a yes sends a patch for `NEW-8` only, so no second story is added and the other fields are not re-sent

#### Scenario: Edit to a backlog story
- **WHEN** the user asks to reword `AC2` of `B1-IAM-0004`, which is in the backlog and not frozen
- **THEN** the skill shows `B1-IAM-0004` with the old and new text of `AC2` and a reason, asks yes/no, and after a yes appends one review row to `reviews/<backlog>.csv`; `backlogs/<backlog>.csv` is byte-for-byte unchanged, the rows already in the review are unchanged, and the reply says the suggestion appears in the editor on that story

#### Scenario: New stories and edits together
- **WHEN** the agreed outcome is two new stories and a Depends On change on `B1-IAM-0004`
- **THEN** one reply shows the two drafts and the edit, one yes/no is asked, and after a yes the stories are in `proposals/` and the edit is in `reviews/`

#### Scenario: Edit to a frozen story
- **WHEN** the user asks to change the Title of `B1-IAM-0007`, which is frozen
- **THEN** the skill says the story is frozen and that a change needs a superseding story, and it appends no review row and no `unlock` row for it

#### Scenario: Second write rejected
- **WHEN** the proposals write succeeded and the review write is rejected
- **THEN** the skill reports that the proposals were written and which problems the review write had, and after the fix sends only the review rows, so no proposed story is added twice

#### Scenario: No confirmation step in the command
- **WHEN** the user runs `/jois-story:propose` after exploring a new story and a fix to `B1-IAM-0004`
- **THEN** the drafts and the edit are shown and then written in the same turn, with no yes/no question

#### Scenario: Lexicon change with a story that uses it
- **WHEN** the agreed outcome is a new term "Export job" and a new story that uses it
- **THEN** one reply shows the term and the story, one yes/no is asked, and after a yes the term is in `lexicons/<backlog file name>` before the story is written to `proposals/`

#### Scenario: Lexicon patch shown with old and new
- **WHEN** the user wants "User" to avoid "account holder" as well
- **THEN** the skill shows the `Avoid` list with its old and new value and says it is a suggestion the user applies in the Lexicon tab, asks yes/no, and after a yes appends one open `edit` suggestion to `lexicon-suggestions/<backlog file name>`; `lexicons/<backlog file name>` is unchanged

#### Scenario: Problem found before the question
- **WHEN** a drafted User Story would be rejected by the writer
- **THEN** the writer's `--check` reports it, the skill fixes the draft and shows it whole, and the user is asked yes/no only once, about the fixed drafts

#### Scenario: Read back after the write
- **WHEN** the proposals writer reports four stories added
- **THEN** the skill reads `proposals/<backlog>` in the same turn, and reports the stories as written only after finding the four IDs

#### Scenario: Write that vanished
- **WHEN** a later read of `proposals/<backlog>` lacks stories the skill reported as written
- **THEN** the skill says they are missing, and sends the stories again; the ones still in the file are skipped and the missing ones are added

#### Scenario: Earlier claim not reused
- **WHEN** the user runs `/jois-story:propose` after an earlier turn that reported a write
- **THEN** the skill reads the file before saying anything is already written

## MODIFIED Requirements
### Requirement: Review command
The command `/jois-story:review` SHALL audit, read-only, only what is under discussion: the stories shaped in the session (backlog or proposed), their dependencies in both directions, the lexicon terms they use or the session changed, and what the session wrote (proposal rows, review rows, lexicon entries and term suggestions). It SHALL re-read the context first, run the writers' `--check` on drafts agreed but not yet written (which writes nothing), and check at least: agreed drafts against what is written, `Avoid` words used in those stories, `Depends On` links to missing, benched or renumbered stories, size over the guidelines' cap, open Clarifications, stale review rows, a review row that edits a frozen story, and suggestions still waiting to be applied in the portal. It SHALL end with a checklist grouped by who acts (the user in the portal, the session via `/jois-story:propose`, a decision needed), or state that everything is in sync. It SHALL NOT review stories outside that scope, only point to `jois-story-review` for a wider check, and SHALL NOT write any file or run a writer without `--check`.

#### Scenario: Agreed edit not written
- **WHEN** the session agreed a change to a backlog story but no review row exists for it
- **THEN** the checklist lists it under the session's actions, to be written with `/jois-story:propose`

#### Scenario: Suggestion waiting
- **WHEN** a written lexicon suggestion for a term the stories use is still open
- **THEN** the checklist lists it under the user's actions in the portal's Lexicon tab

#### Scenario: Problem outside the scope
- **WHEN** an unrelated story breaks a guideline
- **THEN** it is not listed; at most one line suggests `jois-story-review`

#### Scenario: Read-only session
- **WHEN** the audit runs a writer's `--check` on an agreed draft that is not yet written
- **THEN** it reports what the writer would reject and no file changes

#### Scenario: Edit to a frozen story
- **WHEN** a review row edits the Title of a story that is frozen
- **THEN** the checklist lists it as a problem that cannot be applied, with the note that a change to a frozen story needs a superseding story

### Requirement: Context reader serves small sections
The reader script of the story skills SHALL print every result small enough to be shown in full by one run, so it SHALL return the context one section at a time. Run with a backlog and a section it SHALL return only that section: `guidelines` (`references/product-backlog.md`, then `references/sprint-points-guideline.md`) or `index` (the backlog with the columns `ID, Epic, Feature, Title, User Story, Sprint points, Depends On, Frozen`, a column the file lacks skipped, and no other column).

#### Scenario: One section per run
- **WHEN** the reader is run with the section `guidelines`
- **THEN** it returns the guidelines in full, labelled as data, and nothing from the index

#### Scenario: Backlog printed as an index
- **WHEN** the reader is run with the section `index` for a backlog whose stories have User Acceptance Criteria, Clarifications and Notes
- **THEN** the result holds only `ID, Epic, Feature, Title, User Story, Sprint points, Depends On, Frozen` for every story

#### Scenario: Unknown section
- **WHEN** the reader is run with a section name it does not serve
- **THEN** it reports the valid names and returns nothing else

## REMOVED Requirements
### Requirement: Propose skill
**Reason**: Renamed and restated for frozen stories and the new ID shape; its scenarios changed.
**Migration**: Replaced by the requirement of the new name under ADDED; no data changes.
