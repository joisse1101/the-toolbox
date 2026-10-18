# story-proposal-writer Specification

## Purpose

Defines the only way the story skills write: a script that validates drafted stories against the guidelines' format and the backlog, gives them `NEW-<n>` placeholder IDs and adds them to the proposals file.

## Requirements

### Requirement: Writer script
The repository SHALL contain `.claude/skills/propose-stories/write-proposal.mjs`, run as `node .claude/skills/propose-stories/write-proposal.mjs <backlog file name>` with the stories as a JSON array on standard input. It SHALL accept the file name only (validated by the file store's name rules) and no output path: the target is always `proposals/<backlog file name>`, and `user-stories/` is only read. It SHALL write nothing unless every story in the input is valid, and SHALL report all problems found in one run, naming each story by its position in the input. A failed run SHALL leave `proposals/` unchanged, and a successful write SHALL not leave a partly written file.

#### Scenario: Valid input
- **WHEN** valid stories are sent for `data-portal.csv`
- **THEN** they are added to `proposals/data-portal.csv` and `user-stories/data-portal.csv` is byte-for-byte unchanged

#### Scenario: Unknown backlog
- **WHEN** the file name does not exist in `user-stories/`
- **THEN** nothing is written and the message says the backlog was not found

#### Scenario: Several problems at once
- **WHEN** story 2 has no Epic and story 3 has 21 points
- **THEN** nothing is written and both problems are reported, each naming its story

#### Scenario: Name rules
- **WHEN** the file name is `../x.csv`
- **THEN** it is rejected and nothing is written

### Requirement: Input format and validation
Each item in the input list SHALL be either a new story or a patch. An item without an `id` key is a **new story** and SHALL give Epic, Feature, Title, User Story (the full "As a …, I want …, so that …" text), Sprint points, Depends On (a list), User Acceptance Criteria (a list of `AC<n>: Given …, when …, then …` lines) and optionally Notes. An item with an `id` key is a **patch** (see "Patching proposals"). Priority SHALL NOT be accepted. The writer SHALL reject a new story that: lacks Epic, Feature or Title; has a User Story that does not follow the format; has Sprint points other than 1, 2, 3, 5, 8 or 13; has no acceptance criteria or one that does not follow Given-When-Then; contains line breaks in a single-line field; or has unknown keys. Valid Depends On entries are the ID of a story in the backlog, a `NEW-<k>` naming another new story of the same input, and `proposed:NEW-<n>` naming a story already in the proposals file; any other entry, a story depending on itself, and a dependency cycle SHALL be rejected.

#### Scenario: Over the size limit
- **WHEN** a story has Sprint points 21
- **THEN** it is rejected with a message that stories above 13 points are split

#### Scenario: Unknown backlog dependency
- **WHEN** a story depends on `IAM-0099` and the backlog has no such story
- **THEN** it is rejected naming `IAM-0099`

#### Scenario: Dependency inside the input
- **WHEN** new story 2 lists `NEW-1` in Depends On and new story 1 is in the same input
- **THEN** after writing, story 2's Depends On holds the real ID assigned to story 1

#### Scenario: Dependency on an earlier proposal
- **WHEN** a story lists `proposed:NEW-7` and `NEW-7` is in the proposals file
- **THEN** its Depends On holds `NEW-7`; if the file has no `NEW-7` the story is rejected

#### Scenario: Priority refused
- **WHEN** a story includes a Priority
- **THEN** it is rejected

### Requirement: Placeholder IDs and add-or-patch writes
The writer SHALL give each new story a placeholder ID `NEW-<n>` using the portal's rule: the numbers start one above the highest `NEW-<n>` found in the proposals file and in the `Depends On` column of the backlog, and rise by one per new story that is added, in input order. A run SHALL add new stories after the existing rows and MAY patch existing proposals in place; it SHALL NOT remove any proposal, reorder rows, or change the header, a row's unknown columns or any story the input does not name. A new story that repeats a story already in the proposals file is not added (see "Repeated new stories are skipped"). If the proposals file does not exist it SHALL be created with the backlog's columns. The success message SHALL list the IDs assigned to new stories, the IDs patched and the new stories skipped with the ID they matched.

#### Scenario: Numbers continue
- **WHEN** the proposals file holds `NEW-1` and `NEW-4` and two stories are written
- **THEN** they get `NEW-5` and `NEW-6`

#### Scenario: Number named only by the backlog
- **WHEN** the backlog has a story depending on `NEW-9`, the proposals file is empty, and one story is written
- **THEN** it gets `NEW-10`

#### Scenario: Existing proposals untouched
- **WHEN** the user has edited a proposal in the portal and a new run adds a story or patches a different proposal
- **THEN** the edited proposal and its position are unchanged and a new story is last

#### Scenario: File created
- **WHEN** `proposals/data-portal.csv` does not exist
- **THEN** it is created with the backlog's header (including any extra columns) and the new stories

#### Scenario: Run in batches
- **WHEN** a long set of stories is written as several runs
- **THEN** each run is validated alone, each adds its rows after the earlier ones, and earlier runs' rows stay

### Requirement: Written file matches the portal's format
Stories written by the script SHALL be stored in the same cell formats the portal reads and writes (User Story text, one criterion per line, Depends On separated by `;`), so that the Proposed tab shows them with no parse warnings and accepting them works as for stories typed in the portal. The file SHALL be opened by Excel as UTF-8.

#### Scenario: Shown in the portal
- **WHEN** the writer has added a story and the portal's Proposed tab is focused
- **THEN** the story is listed with its fields and criteria filled in and no "does not follow" warning

### Requirement: Patching proposals
A patch SHALL name a story in the proposals file by `id` (`NEW-<n>`) and give only the fields to change, from Epic, Feature, Title, User Story, Sprint points, Depends On, User Acceptance Criteria and Notes. A field that is given replaces the stored value as a whole (a list such as User Acceptance Criteria or Depends On is replaced, not merged); fields that are not given SHALL stay as they are, and Notes SHALL be cleared by giving an empty string. The story keeps its ID, its position and its unknown columns. The patched story SHALL be validated as a whole with the same rules as a new story, with `NEW-<k>` and `proposed:NEW-<n>` accepted in Depends On as for new stories. The writer SHALL reject a patch that: has an `id` that is not in the proposals file or is not a `NEW-<n>` ID; gives no field to change; gives a key outside the fields above (including `priority`, `code` and `benched`); or names the same `id` as another patch in the input. A patch naming a story that is benched in the portal SHALL be rejected with a message that it is benched, without changing it. Nothing SHALL be written unless every item in the input is valid.

#### Scenario: Change one field
- **WHEN** `{"id": "NEW-8", "points": 5}` is sent and `NEW-8` has 3 points
- **THEN** `NEW-8` has 5 points, every other field, its ID and its position are unchanged, and the message names `NEW-8` as patched

#### Scenario: List replaced as a whole
- **WHEN** a patch gives `criteria` with two lines and the story had three criteria
- **THEN** the story has exactly the two given criteria

#### Scenario: Patch and new story together
- **WHEN** one run holds a patch for `NEW-2` and a new story that lists `proposed:NEW-2` in Depends On
- **THEN** both are written in the one run, or neither is

#### Scenario: Merged story invalid
- **WHEN** a patch sets `userStory` to text that does not follow the format
- **THEN** it is rejected naming the item and nothing is written

#### Scenario: Unknown or untouchable id
- **WHEN** a patch names `NEW-99` and the proposals file has no such story, or names a backlog ID such as `IAM-0001`
- **THEN** it is rejected and nothing is written

#### Scenario: Dependency cycle through a patch
- **WHEN** a patch makes `NEW-1` depend on `NEW-2` and `NEW-2` already depends on `NEW-1`
- **THEN** it is rejected as a dependency cycle and nothing is written

#### Scenario: Empty or forbidden patch
- **WHEN** a patch holds only an `id`, or holds `priority`
- **THEN** it is rejected and nothing is written

### Requirement: "As an" is a valid User Story
A new story or patch whose User Story reads `As <role>, I want …, so that …` SHALL be accepted, where the role is the text between `As` and `I want` and may begin with `a` or `an`. The role SHALL be stored as given. A role that is empty, or only the word `a` or `an`, SHALL be rejected. The rejection message for a User Story that does not follow the form SHALL show the form with an example that begins `As a`, and say that `As an` is accepted.

#### Scenario: "an" accepted
- **WHEN** a story's User Story is `As an approver, I want to sign off, so that releases are controlled`
- **THEN** it is written exactly so, and the Proposed tab shows it with no "does not follow" warning

#### Scenario: Role that is only an article
- **WHEN** a User Story reads `As a , I want x, so that y`
- **THEN** it is rejected as having no role

#### Scenario: Message shows the form
- **WHEN** a User Story reads `Approvers want to sign off`
- **THEN** the problem shows "As a …, I want …, so that …" and says "As an …" is accepted

### Requirement: Repeated new stories are skipped
A new story whose Epic, Feature and Title, compared ignoring case and surrounding spaces, equal those of a story already in the proposals file SHALL NOT be added again, and SHALL be reported as skipped with the ID of the story it matched. A skipped story does not use up a `NEW-<n>` number, and a `NEW-<k>` entry in the Depends On of another story of the same input that names a skipped story SHALL resolve to the ID it matched. Two new stories of one input with the same Epic, Feature and Title SHALL be rejected as a problem naming both positions. The content of the matched story SHALL NOT be compared or changed: changing a proposal is a patch.

#### Scenario: Retry after a doubtful write
- **WHEN** a batch of four new stories was written, one of them is missing from the file afterwards, and the same batch is sent again
- **THEN** the three stories that are in the file are reported as skipped with their IDs, the missing one is added, and the file holds four stories

#### Scenario: Retry of a complete write
- **WHEN** the same batch is sent twice and the file was intact
- **THEN** the second run adds nothing, reports every story as skipped and the file is unchanged

#### Scenario: Dependency on a skipped story
- **WHEN** new story 2 lists `NEW-1` in Depends On and story 1 is skipped because it matches `NEW-3`
- **THEN** story 2 is written with Depends On `NEW-3`

#### Scenario: Same title twice in one input
- **WHEN** two new stories of one input have the same Epic, Feature and Title
- **THEN** nothing is written and the problem names both positions

#### Scenario: Different content, same name
- **WHEN** a new story matches the Epic, Feature and Title of `NEW-2` but has other points
- **THEN** it is skipped with `NEW-2` named, and `NEW-2` is unchanged

### Requirement: The result reports the file as stored
After a successful write the writer SHALL read `proposals/<backlog file name>` again and check that every story it added or patched is in it and that the row count is as expected. The success message SHALL then give the row count and the IDs found on disk. If the check fails, the writer SHALL report a failure that says what is missing, and SHALL NOT report the stories as written.

#### Scenario: Message from the disk
- **WHEN** four stories are added to an empty proposals file
- **THEN** the message says the file now holds 4 stories and lists `NEW-1` to `NEW-4` as read from the file

#### Scenario: Write that did not stick
- **WHEN** the file read back after the write lacks an added story
- **THEN** the run fails with a message naming the missing ID

### Requirement: Check without writing
The writer's validation SHALL be available as a check that takes the same input and returns the same problems, and for a valid input the IDs it would assign and the stories it would skip as repeats, without creating or changing any file.

#### Scenario: Problems found by the check
- **WHEN** the check is run on a story with 21 points
- **THEN** it reports the same problem the writer would, and no file changes

#### Scenario: Valid input
- **WHEN** the check is run on three valid new stories and `NEW-4` is the highest ID in the file
- **THEN** it reports that they would be `NEW-5` to `NEW-7`, and the proposals file is unchanged

### Requirement: Patches and dependencies name the story's Title
When the writer is called through the `story-tools` server, a patch SHALL carry `storyTitle`, the current Title of the proposal it changes, and an entry of Depends On that names a story of the backlog or `proposed:NEW-<n>` SHALL be an object `{id, title}`; the pair SHALL be checked as the `story-tools-mcp` capability describes, and a mismatch SHALL be reported without writing anything. The key `title` of a patch keeps its meaning (the new Title). A `NEW-<k>` entry inside the input stays a bare string. When the script is run from the command line these keys are optional: an entry given as a bare ID, or a patch without `storyTitle`, is accepted as before, and a Title that is given is checked. The check form of the writer SHALL report the same mismatches.

#### Scenario: Patch for a renamed proposal
- **WHEN** a patch names `NEW-8` with `storyTitle` `Export audit log` and `NEW-8` has since been retitled `Export audit trail`
- **THEN** nothing is written and the message says `NEW-8` is now "Export audit trail"

#### Scenario: Rename through a patch
- **WHEN** a patch gives `id` `NEW-8`, `storyTitle` `Export audit log` and `title` `Export audit trail`, and `NEW-8` is titled `Export audit log`
- **THEN** `NEW-8` is retitled `Export audit trail`

#### Scenario: Dependency checked against its Title
- **WHEN** a story lists `{id: "IAM-0001", title: "Sign in"}` and `IAM-0001` has another Title
- **THEN** nothing is written and the message names the story and the entry

#### Scenario: Script from the command line
- **WHEN** the script is run with a bare ID in Depends On and no `storyTitle` on a patch
- **THEN** the input is accepted exactly as before
