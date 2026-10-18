## MODIFIED Requirements

### Requirement: Story tools MCP server
The repository SHALL contain a stdio MCP server, `ai/mcp/story-tools.mjs`, started as `node ai/mcp/story-tools.mjs [--read-only]`. It SHALL expose typed tools, each with a description and a JSON input schema, and each calling the same exported function as the matching script: `read_context` (`readStoryContext`), `check_drafts` (the validation step of the writers), `write_proposals` (`writeProposal`), `write_lexicon` (`writeLexicon`) and `write_review` (`writeReview`). With `--read-only` it SHALL expose `read_context` only. The scripts SHALL remain runnable from the command line and SHALL produce the results they did before. The server SHALL write nothing but through those functions, so every rule of the writers (atomic write, all-or-nothing validation, fixed target folders) applies unchanged.

#### Scenario: Same result as the script
- **WHEN** `write_lexicon` is called with the input the script accepts
- **THEN** `lexicons/<backlog>` ends up byte-for-byte as the script would have written it

#### Scenario: Read-only server
- **WHEN** the server is started with `--read-only`
- **THEN** its tool list holds `read_context` and no writer and no `check_drafts`

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

### Requirement: Permissions
`read_context` and `check_drafts` SHALL be annotated read-only and pre-approved by the launchers. `write_proposals`, `write_lexicon` and `write_review` SHALL NOT be pre-approved, so Claude Code asks the user before every write.

#### Scenario: Writer asks first
- **WHEN** the agent calls `write_proposals`
- **THEN** Claude Code asks the user to allow it before anything is written

#### Scenario: Reader does not ask
- **WHEN** the agent calls `read_context`
- **THEN** it runs without a prompt

#### Scenario: Check does not ask
- **WHEN** the agent calls `check_drafts`
- **THEN** it runs without a prompt and no file changes

## ADDED Requirements

### Requirement: Check drafts
`check_drafts` SHALL take a `backlog` and any of `items` (as for `write_proposals`), `terms` (as for `write_lexicon`) and `rows` (as for `write_review`), validate each against the files as they are now with the rules of its writer, and return every problem found, each naming its item by position, or for valid input a confirmation that says what each writer would add (for proposals: the IDs, the patches and the stories it would skip as repeats). It SHALL NOT create or change any file. A check of `items` SHALL NOT take `terms` of the same call into account.

#### Scenario: Rejection before the question
- **WHEN** `check_drafts` is called with a story whose User Story is `Approvers want to sign off`
- **THEN** it returns the same problem `write_proposals` would, and no file changes

#### Scenario: Valid drafts
- **WHEN** `check_drafts` is called with three valid new stories
- **THEN** the reply says they would be added as `NEW-<n>` to `NEW-<n+2>`, and `proposals/<backlog>` is unchanged

### Requirement: Reads that can verify every writer
`read_context` with `section` `proposals` SHALL state how many benched stories it leaves out of its output (and say none when there are none). `section` `reviews` SHALL return the file's row count, the number of open rows and, per story, the number of open rows; with `storyIds` (a list, valid only with this section) it SHALL return the open rows of those stories in full. `section` `lexicon-suggestions` SHALL return the open suggestions in full and the count of decided ones. Each of these SHALL read the file as it is on disk at the time of the call.

#### Scenario: Benched stories counted
- **WHEN** `proposals/<backlog>` holds three stories and one is benched
- **THEN** the `proposals` section lists two and says one benched story is left out

#### Scenario: Reviews of the stories just written
- **WHEN** `read_context` is called with section `reviews` and `storyIds` `["DAM-0002", "DAM-0017"]`
- **THEN** the open rows of those two stories are returned in full, and no other story's rows

#### Scenario: Reviews overview
- **WHEN** `read_context` is called with section `reviews` and no `storyIds`
- **THEN** it returns the row count, the open count and the open count per story, not the rows

#### Scenario: Wrong parameter
- **WHEN** `storyIds` is given with another section
- **THEN** the call is an error naming the parameter
