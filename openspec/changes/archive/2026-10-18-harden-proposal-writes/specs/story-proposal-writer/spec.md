## MODIFIED Requirements

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

## ADDED Requirements

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
