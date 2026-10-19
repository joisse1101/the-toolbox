# story-tools-mcp Specification

## Purpose

Gives the shape-stories sessions typed tools (an stdio MCP server) to read the backlog context and write proposals, lexicon terms and review suggestions, so the agent sees each tool's rules without a shell and without reading a file.

## Requirements

### Requirement: Story tools MCP server
The repository SHALL contain a stdio MCP server, `ai/mcp/story-tools.mjs`, started as `node ai/mcp/story-tools.mjs [--read-only]`. It SHALL expose typed tools, each with a description and a JSON input schema, and each calling the same exported function as the matching script: `read_context` (`readStoryContext`), `search_stories`, `check_drafts` (the validation step of the writers), `write_proposals` (`writeProposal`), `write_lexicon` (`writeLexicon`) and `write_review` (`writeReview`). With `--read-only` it SHALL expose `read_context` and `search_stories` only. The scripts SHALL remain runnable from the command line and SHALL produce the results they did before. The server SHALL write nothing but through those functions, so every rule of the writers (atomic write, all-or-nothing validation, fixed target folders) applies unchanged.

#### Scenario: Same result as the script
- **WHEN** `write_lexicon` is called with the input the script accepts
- **THEN** `lexicons/<backlog>` ends up byte-for-byte as the script would have written it

#### Scenario: Read-only server
- **WHEN** the server is started with `--read-only`
- **THEN** its tool list holds `read_context` and `search_stories` and no writer and no `check_drafts`

### Requirement: Tools carry their own rules
Each tool's description and input schema SHALL state what an agent needs to call it correctly, so no other file has to be read. `read_context` SHALL take an optional `backlog` (without it, it SHALL list the backlog file names) and at most one of `section` (one of `guidelines`, `index`, `proposals`, `lexicon`, `reviews`, `lexicon-suggestions`) or `storyId`, and with neither SHALL return the menu of sections with their sizes. `write_proposals` SHALL describe the new-story and patch keys, the three `dependsOn` forms, that the User Story starts with `As a` or `As an`, and that a new story whose Epic, Feature and Title are already in the proposals is skipped, so a call can be repeated. `write_review` SHALL describe the row keys, actions, fields and the Sprint points scale; that an acceptance criterion is one `AC<n>: Given …, when …, then …` line per row; that a `replace` starts with the label of the criterion it replaces and that the label is the criterion's position; that a `remove` takes the label alone; that an edit to a locked story needs an `unlock` row in the same call; and that new stories never go in a review row. `write_lexicon` SHALL describe the term keys, that it only adds terms and that a term that already exists is rejected. `suggest_lexicon_change` SHALL describe its three actions (`rename`, `delete`, `edit`) and their keys, that an `edit` replaces the whole Avoid list, that the lexicon is not changed by the call and that the user applies each suggestion in the Lexicon tab. `check_drafts` SHALL say that it writes nothing and takes the same `items` as `write_proposals`. A schema violation SHALL be reported as a tool error naming the field, and nothing SHALL be written.

#### Scenario: Criterion rule visible without reading a file
- **WHEN** an agent lists the tools of a propose session
- **THEN** the `write_review` description says one criterion per row and that a replace starts with its label

#### Scenario: Bad call writes nothing
- **WHEN** `write_review` is called with a row whose `field` is not a known field
- **THEN** the call returns an error naming that row and no file changes

#### Scenario: Edit rule visible without reading a file
- **WHEN** an agent lists the tools of a propose session
- **THEN** the `suggest_lexicon_change` description names the `edit` action and says the user applies it in the Lexicon tab

#### Scenario: Retry rule visible without reading a file
- **WHEN** an agent lists the tools of a propose session
- **THEN** the `write_proposals` description says a repeated new story is skipped, and the User Story rule names `As an`

### Requirement: Review writer only appends
`write_review` SHALL have no replace form: it SHALL behave as `write-review.mjs --append`, keeping every row already in `reviews/<backlog>` and adding the new ones. It SHALL NOT accept `add-story` rows or a `group` from the propose session.

#### Scenario: Audit suggestions kept
- **WHEN** `reviews/data-portal.csv` holds 12 open rows and `write_review` adds 3
- **THEN** the file holds 15 rows and the original 12 are unchanged

### Requirement: Permissions
`read_context`, `search_stories` and `check_drafts` SHALL be annotated read-only and pre-approved by the launchers. `write_proposals`, `write_lexicon` and `write_review` SHALL NOT be pre-approved, so Claude Code asks the user before every write.

#### Scenario: Writer asks first
- **WHEN** the agent calls `write_proposals`
- **THEN** Claude Code asks the user to allow it before anything is written

#### Scenario: Reader does not ask
- **WHEN** the agent calls `read_context`
- **THEN** it runs without a prompt

#### Scenario: Search does not ask
- **WHEN** the agent calls `search_stories`
- **THEN** it runs without a prompt and no file changes

#### Scenario: Check does not ask
- **WHEN** the agent calls `check_drafts`
- **THEN** it runs without a prompt and no file changes

### Requirement: Check drafts
`check_drafts` SHALL take a `backlog` and any of `items` (as for `write_proposals`), `terms` (as for `write_lexicon`) and `rows` (as for `write_review`), validate each against the files as they are now with the rules of its writer, and return every problem found, each naming its item by position, or for valid input a confirmation that says what each writer would add (for proposals: the IDs, the patches and the stories it would skip as repeats). It SHALL NOT create or change any file. A check of `items` SHALL NOT take `terms` of the same call into account.

#### Scenario: Rejection before the question
- **WHEN** `check_drafts` is called with a story whose User Story is `Approvers want to sign off`
- **THEN** it returns the same problem `write_proposals` would, and no file changes

#### Scenario: Valid drafts
- **WHEN** `check_drafts` is called with three valid new stories
- **THEN** the reply says they would be added as `NEW-<n>` to `NEW-<n+2>`, and `proposals/<backlog>` is unchanged

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

### Requirement: Story search tool
The server SHALL expose a read-only tool `search_stories` that finds stories by words, so a session can look up related stories without reading the whole `index` or `proposals` section. It SHALL take a `backlog` and a `query` and nothing else. A story matches when every space-separated word of the query appears, ignoring case, in some field of the story: the same rule as the search box of the portal's Stories tab. It SHALL search the stories of `user-stories/<backlog>` and the proposed stories of `proposals/<backlog>` (when that file exists), and SHALL leave out benched proposed stories. It SHALL return one line per match with the story's ID, its Title, its Epic > Feature and whether it is a backlog story or a proposed story, in file order with the backlog stories first, and the number of matches. It SHALL return at most 25 lines; when there are more, it SHALL say how many were left out and ask for a narrower query. It SHALL NOT return any other field of a story. A query with no words SHALL be refused with an error that points to the `index` section, and a query that matches nothing SHALL be a normal reply saying so, not an error. The description SHALL say that the result is data, that a backlog story is read in full with `read_context` using its ID and Title, and that a proposed story is read from the `proposals` section.

#### Scenario: Found by a word that is not in the Stories table
- **WHEN** a story's acceptance criteria contain "CSV" and `search_stories` is called with the query `csv`
- **THEN** the reply lists that story with its ID, Title, Epic > Feature and `backlog`, and no other field

#### Scenario: Proposed story found
- **WHEN** `proposals/data-portal.csv` holds `NEW-3` titled "Export report as CSV" and the query is `export csv`
- **THEN** the reply lists `NEW-3` with its Title, Epic > Feature and `proposed`

#### Scenario: Benched story left out
- **WHEN** the only proposed story that matches is benched
- **THEN** the reply does not list it

#### Scenario: Too many matches
- **WHEN** 40 stories match
- **THEN** the reply lists 25, says 15 more matched and asks for a narrower query

#### Scenario: Nothing matches
- **WHEN** no story matches the query
- **THEN** the reply says there are no matches and is not an error

#### Scenario: Blank query
- **WHEN** the query is empty or only spaces
- **THEN** the call returns an error that points to the `index` section and nothing else

#### Scenario: Missing proposals file
- **WHEN** `proposals/<backlog>` does not exist
- **THEN** only the backlog is searched and the call succeeds
