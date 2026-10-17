# story-tools-mcp Specification

## Purpose

Gives the shape-stories sessions typed tools (an stdio MCP server) to read the backlog context and write proposals, lexicon terms and review suggestions, so the agent sees each tool's rules without a shell and without reading a file.

## Requirements

### Requirement: Story tools MCP server
The repository SHALL contain a stdio MCP server, `ai/mcp/story-tools.mjs`, started as `node ai/mcp/story-tools.mjs [--read-only]`. It SHALL expose typed tools, each with a description and a JSON input schema, and each calling the same exported function as the matching script: `read_context` (`readStoryContext`), `write_proposals` (`writeProposal`), `write_lexicon` (`writeLexicon`) and `write_review` (`writeReview`). With `--read-only` it SHALL expose `read_context` only. The scripts SHALL remain runnable from the command line and SHALL produce the results they did before. The server SHALL write nothing but through those functions, so every rule of the writers (atomic write, all-or-nothing validation, fixed target folders) applies unchanged.

#### Scenario: Same result as the script
- **WHEN** `write_lexicon` is called with the input the script accepts
- **THEN** `lexicons/<backlog>` ends up byte-for-byte as the script would have written it

#### Scenario: Read-only server
- **WHEN** the server is started with `--read-only`
- **THEN** its tool list holds `read_context` and no writer

### Requirement: Tools carry their own rules
Each tool's description and input schema SHALL state what an agent needs to call it correctly, so no other file has to be read. `read_context` SHALL take an optional `backlog` (without it, it SHALL list the backlog file names) and at most one of `section` (one of `guidelines`, `index`, `proposals`, `lexicon`) or `storyId`, and with neither SHALL return the menu of sections with their sizes. `write_proposals` SHALL describe the new-story and patch keys, the three `dependsOn` forms and that a repeated new story is added twice. `write_review` SHALL describe the row keys, actions, fields and the Sprint points scale; that an acceptance criterion is one `AC<n>: Given …, when …, then …` line per row; that a `replace` starts with the label of the criterion it replaces and that the label is the criterion's position; that a `remove` takes the label alone; that an edit to a locked story needs an `unlock` row in the same call; and that new stories never go in a review row. `write_lexicon` SHALL describe the term keys and that a term is never removed by it. A schema violation SHALL be reported as a tool error naming the field, and nothing SHALL be written.

#### Scenario: Criterion rule visible without reading a file
- **WHEN** an agent lists the tools of a propose session
- **THEN** the `write_review` description says one criterion per row and that a replace starts with its label

#### Scenario: Bad call writes nothing
- **WHEN** `write_review` is called with a row whose `field` is not a known field
- **THEN** the call returns an error naming that row and no file changes

### Requirement: Review writer only appends
`write_review` SHALL have no replace form: it SHALL behave as `write-review.mjs --append`, keeping every row already in `reviews/<backlog>` and adding the new ones. It SHALL NOT accept `add-story` rows or a `group` from the propose session.

#### Scenario: Audit suggestions kept
- **WHEN** `reviews/data-portal.csv` holds 12 open rows and `write_review` adds 3
- **THEN** the file holds 15 rows and the original 12 are unchanged

### Requirement: Permissions
`read_context` SHALL be annotated read-only and pre-approved by the launchers. `write_proposals`, `write_lexicon` and `write_review` SHALL NOT be pre-approved, so Claude Code asks the user before every write.

#### Scenario: Writer asks first
- **WHEN** the agent calls `write_proposals`
- **THEN** Claude Code asks the user to allow it before anything is written

#### Scenario: Reader does not ask
- **WHEN** the agent calls `read_context`
- **THEN** it runs without a prompt
