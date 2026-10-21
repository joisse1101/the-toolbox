## MODIFIED Requirements

### Requirement: Tools carry their own rules
Each tool's description and input schema SHALL state what an agent needs to call it correctly, so no other file has to be read. `read_context` SHALL take an optional `backlog` (without it, it SHALL list the backlog file names) and at most one of `section` (one of `guidelines`, `index`, `reviews`, `lexicon-suggestions`) or `storyId`, and with neither SHALL return the menu of sections with their sizes and the paths of the lexicon and proposals files. `write_proposals` SHALL describe the new-story and patch keys, the three `dependsOn` forms, that the User Story starts with `As a` or `As an`, and that a new story whose Epic, Feature and Title are already in the proposals is skipped, so a call can be repeated. `write_review` SHALL describe the row keys, actions, fields and the Sprint points scale; that an acceptance criterion is one `AC<n>: Given …, when …, then …` line per row; that a `replace` starts with the label of the criterion it replaces and that the label is the criterion's position; that a `remove` takes the label alone; that an edit to a locked story needs an `unlock` row in the same call; and that new stories never go in a review row. `write_lexicon` SHALL describe the term keys, that it only adds terms and that a term that already exists is rejected. `suggest_lexicon_change` SHALL describe its three actions (`rename`, `delete`, `edit`) and their keys, that an `edit` replaces the whole Avoid list, that the lexicon is not changed by the call and that the user applies each suggestion in the Lexicon tab. `check_drafts` SHALL say that it writes nothing and takes the same `items` as `write_proposals`. A schema violation SHALL be reported as a tool error naming the field, and nothing SHALL be written.

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

### Requirement: Reads that can verify every writer
`read_context` with `section` `reviews` SHALL return the file's row count, the number of open rows and, per story, the number of open rows; with `storyIds` (a list of `{id, title}` pairs, checked as in "Existing stories are named with their Title"; valid only with this section) it SHALL return the open rows of those stories in full. `section` `lexicon-suggestions` SHALL return the open suggestions in full and the count of decided ones. Each of these SHALL read the file as it is on disk at the time of the call.

#### Scenario: Benched stories counted
- **WHEN** `proposals/<backlog>` holds three stories and one is benched
- **THEN** the menu lists the proposals file and says one row is benched

#### Scenario: Reviews of the stories just written
- **WHEN** `read_context` is called with section `reviews` and `storyIds` naming `DAM-0002` and `DAM-0017` with their Titles
- **THEN** the open rows of those two stories are returned in full, and no other story's rows

#### Scenario: Reviews overview
- **WHEN** `read_context` is called with section `reviews` and no `storyIds`
- **THEN** it returns the row count, the open count and the open count per story, not the rows

#### Scenario: Wrong parameter
- **WHEN** `storyIds` is given with another section
- **THEN** the call is an error naming the parameter

## ADDED Requirements

### Requirement: Lexicon and proposals are read from their files
`read_context` SHALL NOT serve the lexicon or the proposals. A call with `section` `lexicon` or `proposals` SHALL be an error that names the file to read instead (`lexicons/<backlog file name>` or `proposals/<backlog file name>`, as an absolute path) and SHALL return no file content. The menu returned for a backlog SHALL list those two files with their absolute paths, their size in characters and, for the proposals, how many rows are benched, or that the file does not exist yet.

#### Scenario: Lexicon section refused
- **WHEN** `read_context` is called with a backlog and `section` `lexicon`
- **THEN** the call is an error naming the absolute path of `lexicons/<backlog file name>` and no lexicon text is returned

#### Scenario: Proposals section refused
- **WHEN** `read_context` is called with a backlog and `section` `proposals`
- **THEN** the call is an error naming the absolute path of `proposals/<backlog file name>`

#### Scenario: Menu lists the files
- **WHEN** the menu is returned for a backlog whose proposals file has 2 benched stories and whose lexicon file does not exist
- **THEN** it lists the sections `guidelines`, `index`, `reviews` and `lexicon-suggestions` with their sizes, the proposals file with its path, size and "2 benched", and the lexicon file with its path and a note that it does not exist yet
