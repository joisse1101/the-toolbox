## RENAMED Requirements

- FROM: `### Requirement: Placeholder IDs and add-only writes`
- TO: `### Requirement: Placeholder IDs and add-or-patch writes`

## MODIFIED Requirements

### Requirement: Input format and validation
Each item in the input list SHALL be either a new story or a patch. An item without an `id` key is a **new story** and SHALL give Epic, Feature, Title, User Story (the full "As a …, I want …, so that …" text), Sprint points, Depends On (a list), Acceptance Criteria (a list of `AC<n>: Given …, when …, then …` lines) and optionally Notes. An item with an `id` key is a **patch** (see "Patching proposals"). Priority SHALL NOT be accepted. The writer SHALL reject a new story that: lacks Epic, Feature or Title; has a User Story that does not follow the format; has Sprint points other than 1, 2, 3, 5, 8 or 13; has no acceptance criteria or one that does not follow Given-When-Then; contains line breaks in a single-line field; or has unknown keys. Valid Depends On entries are the ID of a story in the backlog, a `NEW-<k>` naming another new story of the same input, and `proposed:NEW-<n>` naming a story already in the proposals file; any other entry, a story depending on itself, and a dependency cycle SHALL be rejected.

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
The writer SHALL give each new story a placeholder ID `NEW-<n>` using the portal's rule: the numbers start one above the highest `NEW-<n>` found in the proposals file and in the `Depends On` column of the backlog, and rise by one per new story in input order. A run SHALL add new stories after the existing rows and MAY patch existing proposals in place; it SHALL NOT remove any proposal, reorder rows, or change the header, a row's unknown columns or any story the input does not name. If the proposals file does not exist it SHALL be created with the backlog's columns. The success message SHALL list the IDs assigned to new stories and the IDs patched.

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

## ADDED Requirements

### Requirement: Patching proposals
A patch SHALL name a story in the proposals file by `id` (`NEW-<n>`) and give only the fields to change, from Epic, Feature, Title, User Story, Sprint points, Depends On, Acceptance Criteria and Notes. A field that is given replaces the stored value as a whole (a list such as Acceptance Criteria or Depends On is replaced, not merged); fields that are not given SHALL stay as they are, and Notes SHALL be cleared by giving an empty string. The story keeps its ID, its position and its unknown columns. The patched story SHALL be validated as a whole with the same rules as a new story, with `NEW-<k>` and `proposed:NEW-<n>` accepted in Depends On as for new stories. The writer SHALL reject a patch that: has an `id` that is not in the proposals file or is not a `NEW-<n>` ID; gives no field to change; gives a key outside the fields above (including `priority`, `code` and `benched`); or names the same `id` as another patch in the input. A patch naming a story that is benched in the portal SHALL be rejected with a message that it is benched, without changing it. Nothing SHALL be written unless every item in the input is valid.

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
