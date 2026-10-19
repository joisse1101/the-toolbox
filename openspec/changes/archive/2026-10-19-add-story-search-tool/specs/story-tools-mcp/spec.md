## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Story tools MCP server
The repository SHALL contain a stdio MCP server, `ai/mcp/story-tools.mjs`, started as `node ai/mcp/story-tools.mjs [--read-only]`. It SHALL expose typed tools, each with a description and a JSON input schema, and each calling the same exported function as the matching script: `read_context` (`readStoryContext`), `search_stories`, `check_drafts` (the validation step of the writers), `write_proposals` (`writeProposal`), `write_lexicon` (`writeLexicon`) and `write_review` (`writeReview`). With `--read-only` it SHALL expose `read_context` and `search_stories` only. The scripts SHALL remain runnable from the command line and SHALL produce the results they did before. The server SHALL write nothing but through those functions, so every rule of the writers (atomic write, all-or-nothing validation, fixed target folders) applies unchanged.

#### Scenario: Same result as the script
- **WHEN** `write_lexicon` is called with the input the script accepts
- **THEN** `lexicons/<backlog>` ends up byte-for-byte as the script would have written it

#### Scenario: Read-only server
- **WHEN** the server is started with `--read-only`
- **THEN** its tool list holds `read_context` and `search_stories` and no writer and no `check_drafts`

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
