## ADDED Requirements

### Requirement: Existing stories are named with their Title
Every `story-tools` input that names a story that already exists SHALL carry that story's current Title next to its ID, and the tool SHALL check the pair before it reads or writes anything for that story. The inputs are: `read_context` `storyId` (with `storyTitle`), each entry of `storyIds` (an object `{id, title}`), `write_review` rows (`storyTitle`, and `targetTitle` on a `Depends On` row for the story named in `suggested`), `write_proposals` patches (`storyTitle`, the proposal's current Title; `title` stays the field to change) and each `dependsOn` entry that names a story of the backlog or a `proposed:` story (an object `{id, title}`). A `NEW-<k>` entry that points to another new story of the same `write_proposals` call SHALL stay a bare string. The Title SHALL be compared ignoring case and surrounding spaces, as for repeated new stories. A call that names an existing story by ID alone SHALL be refused, writing nothing, with a message that says to add the Title and how. `check_drafts` SHALL apply the same check and report the same problems. The tool descriptions SHALL state this rule.

#### Scenario: Matching pair
- **WHEN** `read_context` is called with `storyId` `IAM-0004` and `storyTitle` `Reset password by email`, and `IAM-0004` has that Title
- **THEN** it returns the story as before

#### Scenario: Title missing
- **WHEN** `write_review` is called with a row that has a `storyId` and no `storyTitle`
- **THEN** the call is refused, nothing is written, and the message names the row and says to add `storyTitle`

#### Scenario: Case and spacing ignored
- **WHEN** the Title sent is `  reset PASSWORD by email ` and the story's Title is `Reset password by email`
- **THEN** the pair matches

#### Scenario: Reference inside the call stays bare
- **WHEN** new story 2 of a `write_proposals` call lists `NEW-1` in `dependsOn`
- **THEN** the entry is accepted as a bare string and resolves to story 1 as before

#### Scenario: Bare ID for an existing story
- **WHEN** a `dependsOn` entry is the string `IAM-0001`
- **THEN** the call is refused naming the item and the entry, and says to send `{id, title}`

### Requirement: Mismatch is reported so the agent can relocate the story
When an ID and Title do not match, the tool SHALL write nothing and SHALL return an error that, for each mismatched item (named by its position), says what the ID holds now (its Title, Epic and Feature, or that no story has the ID) and lists every story of the same file that has the given Title, each with its ID, Epic and Feature. When no story has the Title, the message SHALL say so and point to `read_context` with `section` `index` (backlog) or `proposals`. All mismatches of one call SHALL be reported in one reply. The tool SHALL NOT pick a candidate itself: the agent reads the candidate with `read_context`, and repeats the call with the ID and Title it chose, or asks the user when the candidates cannot be told apart. A backlog ID is looked up in the backlog and a `NEW-<n>` in the proposals file.

#### Scenario: ID now holds another story
- **WHEN** a `write_review` row names `IAM-0004` with Title `Reset password by email`, `IAM-0004` is now `Export audit log`, and `IAM-0006` (Access > Credentials) has the Title `Reset password by email`
- **THEN** nothing is written and the reply says `IAM-0004` is now "Export audit log" and lists `IAM-0006` (Access > Credentials) as the story titled "Reset password by email"

#### Scenario: Agent relocates and repeats
- **WHEN** the agent then reads `IAM-0006` with `storyTitle` `Reset password by email` and repeats the `write_review` call with `IAM-0006`
- **THEN** the row is written for `IAM-0006`

#### Scenario: Title shared by two stories
- **WHEN** the Title matches two stories of the backlog
- **THEN** the reply lists both with their ID, Epic and Feature and the agent has to choose, asking the user when it cannot

#### Scenario: Title found nowhere
- **WHEN** the ID exists with another Title and no story has the given Title
- **THEN** the reply names what the ID holds now, says no story has the given Title, and points to the `index` section

#### Scenario: ID not in the file
- **WHEN** `read_context` is called with `storyId` `IAM-0099`, which the backlog does not have, and a Title
- **THEN** the reply says there is no such ID and lists the stories with that Title, if any

#### Scenario: Several mismatches in one call
- **WHEN** rows 1 and 3 of a `write_review` call have a mismatched pair and row 2 is valid
- **THEN** nothing is written and one reply names rows 1 and 3

## MODIFIED Requirements

### Requirement: Reads that can verify every writer
`read_context` with `section` `proposals` SHALL state how many benched stories it leaves out of its output (and say none when there are none). `section` `reviews` SHALL return the file's row count, the number of open rows and, per story, the number of open rows; with `storyIds` (a list of `{id, title}` pairs, checked as in "Existing stories are named with their Title"; valid only with this section) it SHALL return the open rows of those stories in full. `section` `lexicon-suggestions` SHALL return the open suggestions in full and the count of decided ones. Each of these SHALL read the file as it is on disk at the time of the call.

#### Scenario: Benched stories counted
- **WHEN** `proposals/<backlog>` holds three stories and one is benched
- **THEN** the `proposals` section lists two and says one benched story is left out

#### Scenario: Reviews of the stories just written
- **WHEN** `read_context` is called with section `reviews` and `storyIds` naming `DAM-0002` and `DAM-0017` with their Titles
- **THEN** the open rows of those two stories are returned in full, and no other story's rows

#### Scenario: Reviews overview
- **WHEN** `read_context` is called with section `reviews` and no `storyIds`
- **THEN** it returns the row count, the open count and the open count per story, not the rows

#### Scenario: Wrong parameter
- **WHEN** `storyIds` is given with another section
- **THEN** the call is an error naming the parameter
