# backlog-review-suggestions Specification

## Purpose

Turns the findings of a backlog review into data the portal can use: a review CSV written only through a validating script, where every finding is a field edit, shown next to its field and in a Review tab, and applied or dismissed with one click.

## Requirements

### Requirement: Review CSV
A review of a backlog SHALL be stored as a CSV file in the `reviews` folder with the same file name as the backlog it reviews (for example `reviews/data-portal.csv` for `backlogs/data-portal.csv`). One row SHALL describe one field edit, or one suggestion to unlock a story, and SHALL have the columns `Story ID`, `Field`, `Action`, `Current`, `Suggested`, `Reason`, `Area`, `Confidence`, `Group` and `Status`.

- `Story ID` is the ID of the story the edit applies to, or `NEW-<n>` for a story to be created (see "Split suggestions").
- `Field` is one of `Epic`, `Feature`, `Title`, `User Story`, `Sprint points`, `Depends On`, `User Acceptance Criteria`, `Notes`, and is empty on an `unlock` row. Priority is not a Field: reviews do not cover it.
- `Action` is one of `replace`, `add`, `remove`, `append`, `add-story`, `unlock`.
- `Area` is one of `Hierarchy`, `INVEST`, `Acceptance criteria`.
- `Confidence` is `ready` (apply as-is) or `confirm` (a proposed default the user must check).
- `Status` is `open`, `applied` or `dismissed`; a new row is `open`.
- `Reason` is one sentence stating what is wrong.

#### Scenario: One row per edit
- **WHEN** a review finds a missing failure-path criterion on one story and a typo on another
- **THEN** the review CSV has two rows, each with its own Story ID, Field, Action and Reason

#### Scenario: Open in Excel
- **WHEN** the user opens a review CSV in Excel
- **THEN** it opens as UTF-8 with all columns readable

#### Scenario: Unlock row
- **WHEN** the review has a strong objection to the locked story `IAM-0002`
- **THEN** the review CSV has a row with Story ID `IAM-0002`, Action `unlock`, empty Field and Suggested, and the objection as Reason

### Requirement: Every finding yields a field edit
Every finding of a review about a story that is not locked SHALL produce at least one review row with a non-empty `Suggested` value; a finding SHALL NOT be left as advice only. A finding about a locked story SHALL be written as an `unlock` row (see "Unlock suggestion"), and MAY be accompanied by field-edit rows for that story as the evidence for it. The edit for each kind of finding SHALL be:

- Wording, typo or weak "so that": `replace` on the field.
- Missing or vague acceptance criterion: `add` or `replace` on `User Acceptance Criteria`.
- Duplicate or unwanted acceptance criterion: `remove` on `User Acceptance Criteria`, with `Suggested` = the label of the criterion (for example `AC4`).
- A value only the user can decide (for example a page size, a relevance threshold, missing Sprint points; never Priority): `replace` with a proposed default, `Confidence` = `confirm`.
- A story or feature in the wrong place: `replace` on `Epic` or `Feature`.
- A dependency problem: `add` or `remove` on `Depends On`.
- An open question (for example a single-story feature): `append` the question to `Clarifications` (see "Clarification suggestions"), `Confidence` = `confirm`. A fact or decision worth recording, as opposed to something awaiting an answer, MAY still be an `append` to `Notes`.
- A story that is too large or covers several needs: a split group (see "Split suggestions").

#### Scenario: Value only the user can decide
- **WHEN** the review finds that a pagination criterion does not state the page size
- **THEN** it suggests a replacement criterion with a concrete page size and marks the row `confirm`

#### Scenario: Open question becomes a note
- **WHEN** the review finds a Feature with a single story
- **THEN** it suggests appending the question "split, merge or intended?" to that story's Clarifications and marks the row `confirm`

#### Scenario: Objection to a locked story
- **WHEN** the review finds a locked story far over the size limit
- **THEN** it writes an `unlock` row with the Reason and may add the split group as evidence

### Requirement: Suggestions do not grow the story
A suggested value SHALL stay within what the story already implies. It SHALL NOT add a capability, user group, permission or rule that the story does not contain. When a better value would need new scope, the review SHALL suggest a modest value and raise the larger idea as an `append` to `Clarifications` marked `confirm`.

#### Scenario: Benefit that would add scope
- **WHEN** a login story's "so that" restates its "I want" and the obvious fix mentions what the user is "entitled to see" (role-based access)
- **THEN** the suggested wording describes only identifying the user and letting them in, and role-based access is raised as a Clarifications question

### Requirement: Split suggestions
A split SHALL be written as a group of rows sharing one non-empty `Group` value and `Confidence` = `confirm`. The group SHALL narrow the original story with `replace` rows (for example Title, User Story, Sprint points) and SHALL create each new story with `add-story` rows whose `Story ID` is `NEW-<n>`, one row per field, including at least a `Title`. A new story SHALL take its Epic and Feature from the original story unless its rows set them.

#### Scenario: Splitting a 55-point story
- **WHEN** the review splits IAM-0005 into one narrowed story and two new stories
- **THEN** the review CSV has `replace` rows for IAM-0005 and `add-story` rows for `NEW-1` and `NEW-2`, all with the same Group

### Requirement: Single write path for reviews
Review files SHALL be written only by running the Node script `.claude/skills/review-backlog/write-review.mjs`. The `review-backlog` skill and the `propose-stories` skill (for edits to backlog stories) MAY run it, and each skill's tool permissions SHALL allow only that command to write review files. Neither skill SHALL modify the backlog CSV or any file other than the review CSV (`propose-stories` additionally writes `proposals/<backlog file name>` through its own writer). The script SHALL take the backlog file name as its argument, optionally followed by the flag `--append`, and the findings as JSON on standard input. It SHALL always write to `reviews/<backlog file name>` and SHALL NOT accept an output path or any other argument. When a command is refused, the refusal message SHALL list the command forms that are allowed.

#### Scenario: Backlog untouched
- **WHEN** a review is written for `data-portal.csv`
- **THEN** `backlogs/data-portal.csv` is byte-for-byte unchanged and `reviews/data-portal.csv` exists

#### Scenario: Bad file name
- **WHEN** the script is run with a backlog name such as `..\x.csv` or one that does not exist in `backlogs/`
- **THEN** it exits with an error and writes nothing

#### Scenario: Append flag allowed
- **WHEN** the skill runs `write-review.mjs data-portal.csv --append` with findings on standard input
- **THEN** the command is permitted

#### Scenario: Other arguments refused
- **WHEN** the script or the skill's permission check is given an output path or any argument other than the file name and `--append`
- **THEN** it is refused and the message lists the allowed command forms

#### Scenario: Edits written from a propose session
- **WHEN** `propose-stories` writes edits to backlog stories with `write-review.mjs data-portal.csv --append`
- **THEN** the rows are added after the existing rows of `reviews/data-portal.csv`, the rows already there are unchanged, and the portal shows the new rows as open suggestions

### Requirement: Script validates findings
The script SHALL reject the whole input, write nothing, and report every problem found when any finding: names a Story ID that is not in the backlog (other than `NEW-<n>` on an `add-story` row); uses a Field, Action, Area or Confidence outside the allowed values; has an empty `Suggested` (except an `unlock` row, which SHALL have an empty `Field` and `Suggested`); uses an Action that does not fit the Field (for example `add` on `Title`, `remove` on a Field other than `Depends On` and `User Acceptance Criteria`, or `add` on a Field other than `Depends On` and `User Acceptance Criteria`); has an `add-story` row without a Group or a `NEW-<n>` ID, or a new story without a Title; belongs to a Group whose rows do not all have `Confidence` = `confirm`; or is a `Depends On` `add` row whose entry is not a story ID in the backlog, is the story itself, or is a `NEW-<n>` that is not in the same Group. A `Depends On` `remove` row SHALL be accepted when the story lists the entry in its `Depends On`, whether or not a story holds that entry, and SHALL be rejected when the story does not list it; the entry may be a code no story holds, the story's own code or a `NEW-<n>`. It SHALL also reject an `unlock` row for a story that is not locked, and a batch that leaves a field-edit row for a locked story without an `unlock` row for the same story in the resulting review file (an `unlock` row written by an earlier batch counts). Each problem about a finding SHALL name the finding by its position in the input. When the input is not valid JSON, the script SHALL report the parser's message and the position of the failure. The script SHALL ignore any `Current` or `Status` the caller supplies.

#### Scenario: Unknown story
- **WHEN** a finding names `ZZ-0009`, which is not in the backlog
- **THEN** the script exits with an error naming `ZZ-0009` and no review file is created or changed

#### Scenario: Empty suggestion
- **WHEN** a finding that is not an `unlock` row has an empty `Suggested`
- **THEN** the script rejects it, because every finding must carry a field edit

#### Scenario: All problems reported together
- **WHEN** the input has an unknown Story ID and an invalid Action
- **THEN** the error output lists both

#### Scenario: Malformed JSON
- **WHEN** the input has a missing comma after the 3rd finding
- **THEN** the error includes the JSON parser's message and the position it reports, and nothing is written

#### Scenario: Unlock row for an unlocked story
- **WHEN** an `unlock` row names a story that is not locked
- **THEN** the batch is rejected and nothing is written

#### Scenario: Field edit on a locked story without unlock
- **WHEN** a batch has a `replace` row for a locked story and the review file would hold no `unlock` row for it
- **THEN** the batch is rejected, naming the story, and nothing is written

#### Scenario: Unlock row in an earlier batch
- **WHEN** an earlier batch wrote the `unlock` row for a locked story and a later `--append` batch adds a `replace` row for it
- **THEN** the later batch is accepted

#### Scenario: Unlock with a value
- **WHEN** an `unlock` row has a non-empty Field or Suggested
- **THEN** the batch is rejected

#### Scenario: Remove a link to a story that does not exist
- **WHEN** `IAM-0003` lists `IAM-0099` in `Depends On`, no story holds `IAM-0099`, and a `Depends On` `remove` row for `IAM-0003` has `suggested` `IAM-0099`
- **THEN** the row is accepted and written

#### Scenario: Remove a link to the story itself
- **WHEN** `IAM-0003` lists `IAM-0003` in `Depends On` and a `remove` row for it has `suggested` `IAM-0003`
- **THEN** the row is accepted and written

#### Scenario: Remove a link to a proposed story
- **WHEN** `IAM-0003` lists `NEW-4` in `Depends On` and a `remove` row for it has `suggested` `NEW-4`
- **THEN** the row is accepted and written, without a Group

#### Scenario: Remove a link the story does not list
- **WHEN** a `Depends On` `remove` row has `suggested` `IAM-0099` and the story does not list it
- **THEN** the batch is rejected, saying the story does not depend on `IAM-0099`

#### Scenario: Add keeps its checks
- **WHEN** a `Depends On` `add` row has `suggested` `IAM-0099`, which no story holds, or the story's own code
- **THEN** the batch is rejected and nothing is written

### Requirement: Script fills Current from the backlog
For each row the script SHALL set `Current` from the backlog as it was read: the story's current value for the Field on `replace`, `append`, and `Depends On` `add` or `remove`; the text of the criterion being replaced on an `User Acceptance Criteria` `replace` (matched by the `AC<n>` label at the start of `Suggested`, which the script SHALL reject if no such criterion exists; a `remove` on `User Acceptance Criteria` takes the label alone as `Suggested`, and `Current` is the text of that criterion); and empty for `add`, `add-story`, and rows for `NEW-<n>` stories. It SHALL use the same parsing as the portal so `Current` is exactly what the portal will compare against. Every written row SHALL have `Status` = `open`, except rows that keep a status from an earlier review (see "Safe, repeatable writes").

#### Scenario: Current comes from the file
- **WHEN** a finding replaces the User Story of IAM-0001 and the caller supplies a different `Current`
- **THEN** the written row's `Current` is the User Story text in the backlog

### Requirement: Safe, repeatable writes
The script SHALL write the review file atomically so that a failure never leaves a partly written file, SHALL quote CSV values correctly (commas, quotes and line breaks), and SHALL add a byte-order mark to a new file. Without `--append`, when a review file already exists, the script SHALL replace its rows with the new findings, but a new row identical in Story ID, Field, Action and Suggested to an existing row SHALL keep that row's `Status`, so a re-run does not bring back suggestions the user already applied or dismissed.

With `--append`, the script SHALL validate the batch on its own against the backlog, add its rows after the rows already in the review file, and create the file if it does not exist. A row in an appended batch that is identical in Story ID, Field, Action and Suggested to a row decided in the review before the current run (`applied` or `dismissed`) SHALL keep that status, so a review written as several batches keeps earlier decisions exactly as a single-batch review does. A batch that uses a Group name already present in the review file SHALL be rejected, so a split group is never divided across batches.

#### Scenario: Multi-line value
- **WHEN** a suggested criterion contains a line break and a comma
- **THEN** reading the review CSV back returns the identical text

#### Scenario: Re-run keeps decisions
- **WHEN** a review is re-run and one finding is identical to a row marked `dismissed`
- **THEN** that row stays `dismissed` and new findings are `open`

#### Scenario: Review written in batches
- **WHEN** a review is written as a first batch of 10 findings followed by two `--append` batches of 10 findings each
- **THEN** the review file holds all 30 rows and the backlog CSV is unchanged

#### Scenario: Decisions survive batches
- **WHEN** an earlier review had a `dismissed` row and the new run writes an identical finding in a later `--append` batch
- **THEN** that row is `dismissed` in the written file

#### Scenario: Invalid batch leaves earlier batches
- **WHEN** the second of three batches is invalid
- **THEN** it is rejected with its problems, the rows from the first batch remain, and the third batch can still be appended

#### Scenario: Group split across batches
- **WHEN** an `--append` batch uses a Group name that is already in the review file
- **THEN** the batch is rejected and nothing is written

### Requirement: Suggestions in the story form
When the open backlog has a review file of the same name, the tool SHALL load it and show each `open` row next to the field it concerns on the story it names, as a chip showing the suggested value, the Reason, the Area and whether it is `confirm`, with Apply and Dismiss buttons. `confirm` rows SHALL be labelled as a default to check. Rows for fields without an input on the form (for example `Depends On`) SHALL appear in a suggestions list at the bottom of the form. Rows with `Status` `applied` or `dismissed` SHALL NOT be shown as open suggestions.

A `replace` suggestion SHALL show its value as a word-by-word comparison with the row's `Current` value: words only in the suggestion SHALL be highlighted, words only in `Current` SHALL be struck through, and unchanged words SHALL be plain. The comparison SHALL ignore differences in whitespace only. A `replace` row with an empty `Current`, and every other kind of row, SHALL show its value as plain text. The Review tab SHALL show the same comparison.

A `User Acceptance Criteria` `replace` or `remove` suggestion SHALL be shown directly under the criterion it matches (see "Applying a suggestion"), which may carry a different number than the row's label. The `AC<n>` labels in a criterion suggestion, in its suggested text and its `Current` text, are generated numbers and SHALL be shown as the number the criterion has now (for an `add`, the number it will get); the stored row is not changed. An `add` suggestion, and a `replace` or `remove` whose criterion cannot be matched, SHALL appear in the list below the criteria.

#### Scenario: Suggestion beside the field
- **WHEN** a review has an open `replace` row for IAM-0001's User Story
- **THEN** the story form shows the suggested text, its reason and Apply and Dismiss beside the "So that" field

#### Scenario: Changed word highlighted
- **WHEN** a `replace` row has `Current` "AC1: Given a list, when I open it, then i see each request" and `Suggested` "AC1: Given a list, when I open it, then i won't see each request"
- **THEN** only "won't" is highlighted in the suggestion and the other words are plain

#### Scenario: Removed word struck through
- **WHEN** a `replace` row changes "then i see each request" to "then i see requests"
- **THEN** "each" is shown struck through and "requests" is highlighted

#### Scenario: Criterion suggestion under its criterion
- **WHEN** a review has an open `replace` row whose `Suggested` starts with "AC2:" and an open `remove` row for "AC3"
- **THEN** the first suggestion is shown under the second criterion and the second under the third criterion

#### Scenario: Suggestion follows its criterion after a renumber
- **WHEN** an open `remove` row names "AC3" and an earlier criterion has since been removed, so that criterion is now AC2
- **THEN** the suggestion is shown under the second criterion

#### Scenario: Labels show the current numbers
- **WHEN** the first of three open rows ("remove AC12", "remove AC15", "replace AC16") has been applied
- **THEN** the other two are shown as "AC14" and "AC15" in both the suggested text and the `Current` text, and an open `add` row is labelled with the number the new criterion will get

#### Scenario: Added criterion below the criteria
- **WHEN** a review has an open `add` row for User Acceptance Criteria
- **THEN** it is shown in the list below the criteria, not under any criterion

#### Scenario: Criterion no longer on the story
- **WHEN** an open `replace` row names "AC5" and no criterion of the story has the row's `Current` text
- **THEN** the suggestion is shown in the list below the criteria as stale

#### Scenario: No review file
- **WHEN** the open backlog has no review file
- **THEN** the form shows no suggestions and no error

### Requirement: Applying a suggestion
Apply SHALL perform the edit through the same change path as a manual edit, so IDs, dependency links and autosave behave as for a manual edit: `replace` sets the field (for User Acceptance Criteria it replaces the matched criterion), `add` adds an acceptance criterion or a `Depends On` link, `remove` removes a `Depends On` link or the matched acceptance criterion (later criteria are renumbered), `append` adds the text to the end of Notes on a new line. After Apply the row's `Status` SHALL be `applied` in the review file. A `Depends On` `add` that would create a cycle or a link to a missing story SHALL NOT be applied and the user SHALL be told why. A `Depends On` `remove` SHALL remove the entry the row names from the story's `Depends On` as written, whether or not a story holds it now (a code no story holds, the story itself or a `NEW-<n>`), and SHALL NOT check what the entry means now: an entry that has since become a valid link is removed like any other.

A `User Acceptance Criteria` `replace` or `remove` row SHALL be matched to its criterion as follows: the criterion in the position named by the row's label (`AC<n>`) when its text equals the row's `Current`; otherwise the one criterion of the story whose text equals `Current`. The comparison SHALL ignore the `AC<n>:` label, case and whitespace, and SHALL NOT be approximate. When no criterion or more than one criterion matches, the row is stale. Applying a row SHALL NOT change which criterion any other open row matches, so open rows of one story can be applied one at a time in any order.

#### Scenario: Apply a replacement
- **WHEN** the user clicks Apply on a `replace` row for a story's Title
- **THEN** the Title becomes the suggested value, the backlog autosaves, and the row is `applied` in the review file

#### Scenario: Apply an added criterion
- **WHEN** the user clicks Apply on an `add` row for User Acceptance Criteria
- **THEN** a new criterion with the suggested Given, When and Then is added to the story and the criteria numbering stays sequential

#### Scenario: Dependency would create a cycle
- **WHEN** Apply on an `add` row for Depends On would close a dependency cycle
- **THEN** the backlog is unchanged, the row stays `open` and a message explains the reason

#### Scenario: Remove a dangling link
- **WHEN** Apply is clicked on a `remove` row for `Depends On` whose entry is `IAM-0099`, which no story holds, and the story still lists it
- **THEN** `IAM-0099` is removed from the story's `Depends On`, the story's other links are unchanged, and the row is `applied`

#### Scenario: Remove a link to a proposed story
- **WHEN** Apply is clicked on a `remove` row whose entry is `NEW-4` and the story still lists `NEW-4`
- **THEN** `NEW-4` is removed from the story's `Depends On` and the row is `applied`

#### Scenario: Removed entry became a real story
- **WHEN** a `remove` row names `IAM-0099`, a story now holds `IAM-0099`, and the story still lists it
- **THEN** Apply removes the link, as for any other entry

#### Scenario: Link already gone
- **WHEN** a `remove` row names an entry the story no longer lists
- **THEN** the row is stale

#### Scenario: Rows applied one at a time after a removal
- **WHEN** a story has open rows "remove AC12", "remove AC15", "replace AC16" and an `add`, and the user applies them one at a time starting with "remove AC12"
- **THEN** each later row is still current and acts on the criterion its `Current` text names, now numbered one or two lower, and no row becomes stale

#### Scenario: Criterion deleted by hand
- **WHEN** the user deletes AC2 by hand after the review was written and a `replace` row names "AC5" with the text of what is now AC4
- **THEN** Apply replaces that criterion, now AC4

#### Scenario: Same text twice
- **WHEN** a `remove` row's `Current` text matches two criteria and neither is in the position the row names
- **THEN** the row is stale and nothing is removed

### Requirement: Stale suggestions
A suggestion SHALL be stale when the live story no longer matches what the row expects: the field value differs from `Current` for `replace`, the criterion to replace or remove cannot be matched to exactly one criterion by its `Current` text (see "Applying a suggestion"), an `add`ed criterion or link already exists, a link to remove is absent, or the story is no longer found by its ID. A stale suggestion SHALL be shown as stale with its Reason and a Dismiss button, and SHALL NOT offer Apply.

#### Scenario: Field edited since the review
- **WHEN** the user edits a Title by hand after the review was written
- **THEN** the review row for that Title shows as stale and cannot be applied

#### Scenario: IDs changed
- **WHEN** a story moved to another Epic and was renumbered
- **THEN** rows naming its old ID show as stale instead of being applied to a different story

#### Scenario: Criterion edited since the review
- **WHEN** the user edits the text of the criterion a `replace` row targets
- **THEN** the row is stale, even if a criterion still sits in the position it names

### Requirement: Dismissing a suggestion
Dismiss SHALL set the row's `Status` to `dismissed` in the review file without changing the backlog.

#### Scenario: Dismiss
- **WHEN** the user clicks Dismiss
- **THEN** the chip disappears and the row is `dismissed` in the review file

### Requirement: Applying a split group
A group of rows SHALL be applied as one unit with a single Apply. Apply SHALL be offered only if every row in the group is current; otherwise the whole group shows as stale. Applying SHALL narrow the original story and create the new stories in one edit, and every row of the group SHALL then be `applied`. Dismiss on a group SHALL dismiss all its rows.

#### Scenario: Apply a split
- **WHEN** the user clicks Apply on a split group with two `add-story` stories
- **THEN** the original story is narrowed, two new stories exist with the suggested fields, and all rows of the group are `applied`

#### Scenario: One row of the group is stale
- **WHEN** the user edited the original story's Title after the review
- **THEN** the whole group shows as stale and nothing is applied

### Requirement: Suggestion count in the story list
Each story in the story list SHALL show the number of its open, non-stale suggestions when there are any.

#### Scenario: Badge
- **WHEN** a story has three open suggestions
- **THEN** its list row shows a badge with 3, and the badge decreases as suggestions are applied or dismissed

### Requirement: Review tab
The tool SHALL provide a Review tab, shown when the open backlog has a review file, that lists every suggestion of the review in one place: open suggestions grouped by Area (Hierarchy, INVEST, Acceptance criteria) and, within an Area, in backlog order. Each entry SHALL show the story's ID and Title (a link that opens the story in the editor), the Field, the suggested value, the Reason, whether it is a `confirm` default, and Apply and Dismiss with the same behaviour as in the story form. A split group SHALL appear once, under the story it narrows. Entries that are out of date, including those whose story no longer exists, SHALL appear in a separate "Out of date" section with Dismiss only. The tab SHALL show the count of open suggestions, and an empty state when there are none. There SHALL be no "apply all" action.

#### Scenario: Overview grouped by Area
- **WHEN** a review has suggestions in all three Areas
- **THEN** the Review tab shows three sections, each listing its suggestions with the story they concern

#### Scenario: Apply from the overview
- **WHEN** the user clicks Apply on an entry in the Review tab
- **THEN** the change is made exactly as from the story form and the entry leaves the open list

#### Scenario: Open the story
- **WHEN** the user clicks the story link of an entry
- **THEN** the Editor tab opens on that story

#### Scenario: Out-of-date entries
- **WHEN** a story was renumbered after the review
- **THEN** its entries appear under "Out of date" with Dismiss only

#### Scenario: No review
- **WHEN** the open backlog has no review file or no open suggestions
- **THEN** the Review tab says there is nothing to review

### Requirement: Review file errors do not block editing
If the review file cannot be read or is not valid, the tool SHALL show a message and SHALL keep the backlog editable. If the review file cannot be written when a suggestion's Status changes (for example it is open in Excel), the tool SHALL say so and retry as autosave does; the edit to the backlog SHALL NOT be undone.

#### Scenario: Review file locked
- **WHEN** the user clicks Apply while the review file is locked by Excel
- **THEN** the backlog edit is made and saved, and the tool reports that the review status could not yet be saved

### Requirement: Suggestions of a story moved to Proposed
When a backlog story is moved to Proposed, its open review suggestions (those that can still be applied or are stale) SHALL be marked dismissed in the review file, like a manual Dismiss; applied and dismissed rows SHALL be left as they are. When the story has any open suggestion the user SHALL be asked to confirm before the move, and the question SHALL say that the suggestions will be dismissed; declining SHALL leave the story, the backlog, the proposals and the review file unchanged. When the story has none, the move SHALL happen without a confirmation. A split group that includes the story SHALL be dismissed as a whole.

#### Scenario: Confirm and dismiss
- **WHEN** the user moves a story that has 2 open suggestions and confirms
- **THEN** the story is in Proposed and both suggestions have status dismissed

#### Scenario: Declined
- **WHEN** the user declines the confirmation
- **THEN** nothing changes

#### Scenario: Nothing to dismiss
- **WHEN** the story has no open suggestion, only applied or dismissed ones
- **THEN** the move happens without a prompt and those rows are unchanged

### Requirement: Suggestions follow stories renumbered by a move
When moving a story to Proposed renumbers the stories below it, the open suggestions of those stories SHALL be re-pointed to their new IDs, including the story IDs named in the Current and Suggested of Depends On suggestions, so no suggestion lands on a different story. A Depends On suggestion that names the moved story SHALL then name its new placeholder ID. Applied and dismissed suggestions SHALL stay as written.

#### Scenario: Later story keeps its suggestions
- **WHEN** `IAM-0002` is moved to Proposed and `IAM-0003` becomes `IAM-0002`
- **THEN** the open suggestions that were on `IAM-0003` are on `IAM-0002` and are still applicable

### Requirement: Unlock suggestion
When the review has a strong objection to a locked story, it SHALL be written as one row with `Action` = `unlock` for that story: `Field`, `Current`, `Suggested` and `Group` empty, `Reason` = one sentence stating the objection, `Area` and `Confidence` as for any row. An `unlock` row SHALL be shown as a banner above the story in the story form reading that the review suggests unlocking and reviewing the story, with the Reason, an **Unlock** button and a **Dismiss** button; it SHALL also appear in the Review tab under its Area with the same two buttons. **Unlock** SHALL unlock the story, set the row to `applied`, change nothing else and be autosaved like any edit; the story is then reviewed by the next review run. **Dismiss** SHALL set the row to `dismissed` and leave the story locked. An `unlock` row SHALL be stale when its story is no longer found or is no longer locked, and then SHALL offer Dismiss only. The story list's suggestion badge SHALL count an open `unlock` row like any other suggestion.

#### Scenario: Banner on a locked story
- **WHEN** a review has an open `unlock` row for the locked story `IAM-0002`
- **THEN** the story form shows a banner with the Reason and Unlock and Dismiss above the story

#### Scenario: Unlock from the banner
- **WHEN** the user clicks Unlock on the banner
- **THEN** the story is unlocked and saved, the row is `applied`, and no other field of the story changed

#### Scenario: Dismiss keeps the lock
- **WHEN** the user clicks Dismiss on the banner
- **THEN** the story stays locked and the row is `dismissed`

#### Scenario: Unlocked by hand
- **WHEN** the user unlocks the story with the toggle while its `unlock` row is open
- **THEN** the row shows as stale with Dismiss only

### Requirement: Suggestions on a locked story cannot be applied
A field-edit suggestion (any row other than `unlock`) for a locked story SHALL be shown where it is shown for any story, marked as belonging to a locked story, with Dismiss but without an enabled Apply, until the story is unlocked. This applies to suggestions written for the story while it was locked and to suggestions that already existed when it was locked. A split group that narrows a locked story SHALL be treated the same way as a whole. Once the story is unlocked, the suggestion SHALL behave as for any story, including the staleness rules.

#### Scenario: Apply disabled
- **WHEN** a locked story has an open `replace` row for its Title
- **THEN** the chip shows the suggestion, its Reason and Dismiss, and Apply is disabled with a hint to unlock the story

#### Scenario: Locked after the review
- **WHEN** a story with an open suggestion is locked
- **THEN** Apply on that suggestion becomes disabled, and becomes available again after unlocking

#### Scenario: Split group on a locked story
- **WHEN** a split group narrows a locked story
- **THEN** the group cannot be applied until the story is unlocked

### Requirement: Clarification suggestions
A review file MAY hold rows that suggest a question for a story's `Clarifications`, written by `review-backlog` through `write-review.mjs`. Such a row SHALL have `Field` = `Clarifications`, `Action` = `append`, `Suggested` = the question text, a `Reason` saying why the question matters, and `Group` empty; `Area` MAY be any Area, including `Clarification`, which is added to the allowed Areas, and `Confidence` MAY be `ready` or `confirm`. These values are allowed in addition to those of the Review CSV requirement. Both `review-backlog` and `propose-stories` MAY write `resolve` rows (see "Resolve clarification suggestions"); `review-backlog` writes one only for a question that the story's own text already answers. Such rows SHALL be shown in the story form and the Review tab like any other suggestion (the Review tab SHALL list the `Clarification` Area with the others). **Apply** SHALL add a new pair at the end of the story's `Clarifications` with the suggested text as the question and an empty answer, set the row to `applied`, and be autosaved like any edit; the story's "N open" badge SHALL then count it. **Dismiss** SHALL behave as for any suggestion. A row SHALL be stale when its story is no longer found or the story already has a question with the same text (ignoring case and extra spaces). A clarification suggestion on a locked story SHALL follow the lock rules of the other suggestions.

#### Scenario: Apply a suggested question
- **WHEN** the user applies an open clarification suggestion on story `IAM-0003`
- **THEN** `IAM-0003` has a new question with an empty answer, the row is `applied`, and the story shows one more open question

#### Scenario: Already asked
- **WHEN** the story already has a question with the suggested text
- **THEN** the row is shown as out of date with Dismiss only

#### Scenario: Locked story
- **WHEN** the story is locked and the review has no open unlock row for it
- **THEN** Apply is disabled as for any suggestion on a locked story

#### Scenario: Review skill writes a resolve row
- **WHEN** `review-backlog` finds that a story's Notes already state the answer to an open question
- **THEN** it may write a `resolve` row for that question, and the row is applied and shown like one written by `propose-stories`

### Requirement: Accept all in the Review tab
The Review tab SHALL offer an **Accept all** button in its header, which applies the open suggestions of every Area section, and an **Accept all** button on each Area section, which applies only the open suggestions of that section. A button SHALL be disabled when its scope has no open suggestion. Before anything is applied the tool SHALL ask the user to confirm, saying how many suggestions will be applied; declining SHALL change nothing.

Accept all SHALL apply the eligible suggestions one after the other in the order the tab lists them, each against the backlog as the previous one left it, with the same effect as clicking Apply on each. A suggestion SHALL NOT be applied, and SHALL stay open and unchanged, when it is an `unlock` row, when its story is locked, when any of its rows has `Confidence` = `confirm`, or when it cannot be applied at that point (it is stale, or applying it would be refused, for example because it would close a dependency cycle). A split group SHALL count as one suggestion. A suggestion that cannot be applied SHALL NOT stop the run: the next one is still tried.

The backlog edits of one run and the `applied` status of the rows it applied SHALL be saved like those of a single Apply. When the run ends the tool SHALL say how many suggestions were applied and how many were left open, with the number left for each reason (unlock row, locked story, needs a check, could not be applied).

#### Scenario: Accept all in the header
- **WHEN** the Review tab has 5 open suggestions that are all eligible and the user clicks Accept all in the header and confirms
- **THEN** all 5 are applied to the backlog, their rows are `applied`, and the tool reports 5 applied and none left open

#### Scenario: Accept all for one Area
- **WHEN** the tab has open suggestions in Hierarchy and INVEST and the user clicks Accept all on the INVEST section and confirms
- **THEN** only the INVEST suggestions are applied and the Hierarchy ones stay open

#### Scenario: Confirm default skipped
- **WHEN** an open suggestion has `Confidence` = `confirm` and the user accepts all
- **THEN** it is not applied, it stays open, and the summary counts it as needing a check

#### Scenario: Locked story skipped
- **WHEN** an open field-edit suggestion belongs to a locked story and the user accepts all
- **THEN** it is not applied and stays open

#### Scenario: Unlock row skipped
- **WHEN** the tab has an open `unlock` row and the user accepts all
- **THEN** the story stays locked and the row stays open

#### Scenario: Suggestion that cannot be applied
- **WHEN** applying an earlier suggestion of the run makes a later one stale
- **THEN** the later one is not applied and stays open, and the suggestions after it are still applied

#### Scenario: Declined
- **WHEN** the user declines the confirmation
- **THEN** the backlog and the review file are unchanged

#### Scenario: Nothing eligible
- **WHEN** every open suggestion in the scope is skipped
- **THEN** nothing is applied and the summary says so, with the reasons

### Requirement: Rows written through the tool name the story's Title
When the review writer is called through the `backlog-tools` server, each row SHALL carry `storyTitle`, the story's current Title, and a `Depends On` row SHALL carry `targetTitle`, the Title of the story named in `suggested`. A `Depends On` `remove` row whose entry no story holds (a code that does not exist, the story itself or a `NEW-<n>`) has no story to name and SHALL NOT need `targetTitle`; when a story does hold the code, `targetTitle` is required and checked as for an `add` row. The pairs SHALL be checked against the backlog as the `backlog-tools-mcp` capability describes, and a mismatch SHALL be reported without writing any row. The Titles are used only for this check: they SHALL NOT be stored, the review file's columns SHALL NOT change, and the portal SHALL read and apply the rows as before. When the script is run from the command line these keys are optional, and a Title that is given is checked.

#### Scenario: Row for a renumbered story
- **WHEN** a row names `IAM-0004` with `storyTitle` `Reset password by email` and the backlog has since been renumbered so that `IAM-0004` is another story
- **THEN** nothing is written and the message says what `IAM-0004` holds now and which story has the Title

#### Scenario: Dependency target checked
- **WHEN** a `Depends On` `add` row has `suggested` `IAM-0002` and `targetTitle` `Sign in`, and `IAM-0002` has another Title
- **THEN** nothing is written and the message names the row

#### Scenario: Removing a link whose code a story holds
- **WHEN** a `Depends On` `remove` row has `suggested` `IAM-0002`, a story holds `IAM-0002`, and the row has no `targetTitle`
- **THEN** nothing is written and the message says to add the Title

#### Scenario: Removing a link no story holds
- **WHEN** a `Depends On` `remove` row through the tool has `suggested` `IAM-0099`, no story holds `IAM-0099`, and the row has no `targetTitle`
- **THEN** the row is accepted

#### Scenario: Stored row unchanged
- **WHEN** a row with `storyTitle` is accepted
- **THEN** the review file holds the same columns and values as a row written without it

#### Scenario: Script from the command line
- **WHEN** the script is run with rows that have no `storyTitle`
- **THEN** they are written as before

### Requirement: Resolve clarification suggestions
A review file MAY hold rows that settle a question of a backlog story, written by `propose-stories` through `write_review`. Such a row SHALL have `Field` = `Clarifications` and `Action` = `resolve`, no Group, and `Suggested` the note to add to Notes (non-empty, MAY have several lines, not starting with a `Q<n>:` or `A<n>:` label). The finding names the pair by its number in a `pair` key (a number, as the story read shows it); the writer SHALL fill `Current` with that pair's question text from the backlog, as it fills `Current` for a criterion, and the stored row finds its pair by that text afterwards, ignoring case and surrounding blank space. It SHALL reject a finding without `pair`, one whose `pair` does not exist, and one on a story whose Clarifications cell is free text. The pair MAY have an empty or a filled answer. **Apply** SHALL, in one edit, append `Suggested` to the story's Notes on a new line (as the whole Notes when empty) and remove the pair, the later pairs being renumbered; **Dismiss** leaves both unchanged. The row is **stale** when no pair has the question text any more, when the Clarifications cell is free text, or when Notes already contain the suggested text. A resolve row on a locked story SHALL follow the lock rules of the other field edits, and Accept all SHALL apply it as it applies other rows.

#### Scenario: Apply resolves the pair
- **WHEN** the user applies an open resolve row on story `IAM-0003` for the question "Who owns approvals?" with the note "Approvals are owned by Finance"
- **THEN** the story's Notes end with that line, the question is gone from its Clarifications, and the "N open" badge drops by one if it was open

#### Scenario: Pair found after another row
- **WHEN** an earlier applied row removed pair 1, so the question is now pair 1 instead of 2
- **THEN** the row still finds the pair by its question text

#### Scenario: Question gone
- **WHEN** the question was deleted in the editor after the row was written
- **THEN** the row is shown as out of date with Dismiss only

#### Scenario: Notes already hold the decision
- **WHEN** Notes already contain the suggested text
- **THEN** the row is stale, and Dismiss is available

#### Scenario: Locked story
- **WHEN** a resolve row targets a locked story and the review has no `unlock` row for it
- **THEN** the writer rejects it, as for any field edit on a locked story

### Requirement: Consistency area
`Consistency` SHALL be added to the allowed Areas, with `Hierarchy`, `INVEST`, `Acceptance criteria` and `Clarification`. A row with Area `Consistency` MAY have any Field and Action that the Field/Action rules allow. The writer SHALL accept it and reject an Area outside the list, naming the allowed ones. The Review tab SHALL list `Consistency` as a section after the other Areas, with its own Accept all button and the same open, applied and dismissed handling as every other Area. An Area section with no suggestions SHALL NOT be shown. Existing review files without Consistency rows SHALL load unchanged.

#### Scenario: Writer accepts Consistency
- **WHEN** a finding has Area `Consistency`
- **THEN** the writer accepts it, and a finding with Area `Cohesion` is rejected with the allowed Areas listed

#### Scenario: Review tab section
- **WHEN** a review has open `Consistency` rows
- **THEN** the Review tab shows a `Consistency` section with those rows and an Accept all button for it

#### Scenario: Old review file
- **WHEN** a review file has no `Consistency` rows
- **THEN** it loads as before and the tab shows no Consistency section
