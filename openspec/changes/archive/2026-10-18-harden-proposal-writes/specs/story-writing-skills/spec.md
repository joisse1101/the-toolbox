## MODIFIED Requirements

### Requirement: Propose skill
The repository SHALL contain a skill `propose-stories` at `.claude/skills/propose-stories/SKILL.md` that turns agreed stories into proposed stories in `proposals/<backlog file name>`, applies agreed changes to proposed stories already there, turns agreed changes to stories already in the backlog into suggestions for the editor in `reviews/<backlog file name>`, adds new terms to the backlog's lexicon in `lexicons/<backlog file name>`, and turns agreed changes to terms already there (an edit, a rename or a delete) into suggestions in `lexicon-suggestions/<backlog file name>`. It SHALL run the reader script at the start of every use, even when `explore-stories` already ran it in the same session, so that what it adds, patches or suggests builds on the files as they are now. It SHALL show, in one reply, the complete drafts (Epic, Feature, Title, User Story, Sprint points, Depends On, User Acceptance Criteria, Notes) of new stories; for each patch, the story it changes and the fields that change with their old and new values; for each edit to a backlog story, the story (ID and Title) and each field edit with its old and new value and its reason; for each added term, its fields; and for each change to an existing term (edit, rename or delete), the term and each field with its old and new value and the reason. Before it asks, it SHALL run `check_drafts` on the new stories, edits and terms it is about to write, and fix any problem it reports with the user (showing the changed drafts whole) so that the question is asked only about drafts the writers will accept. It SHALL then ask one direct yes/no question covering everything shown, and write only after the user confirms in a separate message. An answer to a design question, or approval of the idea, SHALL NOT count as confirmation. After any change to the drafts, patches, edits or lexicon changes the skill SHALL ask again. The files it may write are `proposals/<backlog file name>`, only through the writer script described by the `story-proposal-writer` capability, `reviews/<backlog file name>`, only through the review writer in its `--append` form (see `backlog-review-suggestions`), `lexicons/<backlog file name>`, only through the writer described by the `lexicon-writer` capability (new terms only), and `lexicon-suggestions/<backlog file name>`, only through the tool described by `lexicon-suggestions`; the backlog CSV SHALL never be modified. Edits to backlog stories SHALL be written as review rows with `--append` only, so the rows already in the review are kept; they SHALL use the existing review Area values; and they SHALL NOT use `add-story` rows, because a new story always goes to the proposals. An edit to a locked story SHALL be accompanied by an `unlock` row for it and the draft SHALL say that the edit cannot be applied until the story is unlocked. New terms SHALL be written directly to the lexicon, without a staging step, and SHALL be written first, so stories written in the same run can use a term defined in it. A change to a term that already exists SHALL only be suggested, never patched into the lexicon, and the draft SHALL say that the user applies it in the Lexicon tab. The writes SHALL be separate commands; when a later one is rejected the skill SHALL report what was written and fix only the rejected part, never running an earlier one again. After every write the skill SHALL read the same file back with `read_context` in the same turn and compare it with what it sent (proposals: the IDs and the row count; lexicon: the terms; reviews and lexicon suggestions: the rows, by story), and SHALL call something written only when the read-back matches. It SHALL NOT repeat an earlier statement that something was written without such a read in the current turn. When the read-back does not match, the skill SHALL say so, say what is missing, and send again only the missing part: new stories already in the proposals are skipped by the writer, so a repeated proposals call is safe, and a missing term or review row is sent alone. It SHALL prefer a patch to adding a new story when the user wants to change an existing proposal. It SHALL cite the guidelines for the story format, size and sprint points and SHALL NOT restate them.

The command `/story:propose` SHALL follow the same skill without the yes/no step: it SHALL show the drafts, patches, edits and lexicon changes and then write them in the same turn, with the same writers and rules.

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
- **WHEN** `explore-stories` ran the reader earlier in the session and the user then starts `propose-stories`
- **THEN** the skill runs the reader again before drafting or patching anything

#### Scenario: Fix an existing proposal
- **WHEN** the user asks to change the points of `NEW-8` after it was written
- **THEN** the skill shows `NEW-8` with the points changing from the old to the new value, asks yes/no, and after a yes sends a patch for `NEW-8` only, so no second story is added and the other fields are not re-sent

#### Scenario: Edit to a backlog story
- **WHEN** the user asks to reword `AC2` of `IAM-0004`, which is in the backlog and not locked
- **THEN** the skill shows `IAM-0004` with the old and new text of `AC2` and a reason, asks yes/no, and after a yes appends one review row to `reviews/<backlog>.csv`; `user-stories/<backlog>.csv` is byte-for-byte unchanged, the rows already in the review are unchanged, and the reply says the suggestion appears in the editor on that story

#### Scenario: New stories and edits together
- **WHEN** the agreed outcome is two new stories and a Depends On change on `IAM-0004`
- **THEN** one reply shows the two drafts and the edit, one yes/no is asked, and after a yes the stories are in `proposals/` and the edit is in `reviews/`

#### Scenario: Edit to a locked story
- **WHEN** the user asks to change the Title of `IAM-0007`, which is locked
- **THEN** the draft says the edit cannot be applied until the story is unlocked, and after a yes an `unlock` row for `IAM-0007` and the edit row are appended together

#### Scenario: Second write rejected
- **WHEN** the proposals write succeeded and the review write is rejected
- **THEN** the skill reports that the proposals were written and which problems the review write had, and after the fix sends only the review rows, so no proposed story is added twice

#### Scenario: No confirmation step in the command
- **WHEN** the user runs `/story:propose` after exploring a new story and a fix to `IAM-0004`
- **THEN** the drafts and the edit are shown and then written in the same turn, with no yes/no question

#### Scenario: Lexicon change with a story that uses it
- **WHEN** the agreed outcome is a new term "Export job" and a new story that uses it
- **THEN** one reply shows the term and the story, one yes/no is asked, and after a yes the term is in `lexicons/<backlog file name>` before the story is written to `proposals/`

#### Scenario: Lexicon patch shown with old and new
- **WHEN** the user wants "User" to avoid "account holder" as well
- **THEN** the skill shows the `Avoid` list with its old and new value and says it is a suggestion the user applies in the Lexicon tab, asks yes/no, and after a yes appends one open `edit` suggestion to `lexicon-suggestions/<backlog file name>`; `lexicons/<backlog file name>` is unchanged

#### Scenario: Problem found before the question
- **WHEN** a drafted User Story would be rejected by the writer
- **THEN** `check_drafts` reports it, the skill fixes the draft and shows it whole, and the user is asked yes/no only once, about the fixed drafts

#### Scenario: Read back after the write
- **WHEN** `write_proposals` reports four stories added
- **THEN** the skill reads `proposals` with `read_context` in the same turn, and reports the stories as written only after finding the four IDs

#### Scenario: Write that vanished
- **WHEN** a later read of `proposals/<backlog>` lacks stories the skill reported as written
- **THEN** the skill says they are missing, and sends the stories again; the ones still in the file are skipped and the missing ones are added

#### Scenario: Earlier claim not reused
- **WHEN** the user runs `/story:propose` after an earlier turn that reported a write
- **THEN** the skill reads the file before saying anything is already written

