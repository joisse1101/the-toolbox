## MODIFIED Requirements

### Requirement: Tools carry their own rules
Each tool's description and input schema SHALL state what an agent needs to call it correctly, so no other file has to be read. `read_context` SHALL take an optional `backlog` (without it, it SHALL list the backlog file names) and at most one of `section` (one of `guidelines`, `index`, `proposals`, `lexicon`) or `storyId`, and with neither SHALL return the menu of sections with their sizes. `write_proposals` SHALL describe the new-story and patch keys, the three `dependsOn` forms and that a repeated new story is added twice. `write_review` SHALL describe the row keys, actions, fields and the Sprint points scale; that an acceptance criterion is one `AC<n>: Given …, when …, then …` line per row; that a `replace` starts with the label of the criterion it replaces and that the label is the criterion's position; that a `remove` takes the label alone; that an edit to a locked story needs an `unlock` row in the same call; and that new stories never go in a review row. `write_lexicon` SHALL describe the term keys, that it only adds terms and that a term that already exists is rejected. `suggest_lexicon_change` SHALL describe its three actions (`rename`, `delete`, `edit`) and their keys, that an `edit` replaces the whole Avoid list, that the lexicon is not changed by the call and that the user applies each suggestion in the Lexicon tab. A schema violation SHALL be reported as a tool error naming the field, and nothing SHALL be written.

#### Scenario: Criterion rule visible without reading a file
- **WHEN** an agent lists the tools of a propose session
- **THEN** the `write_review` description says one criterion per row and that a replace starts with its label

#### Scenario: Bad call writes nothing
- **WHEN** `write_review` is called with a row whose `field` is not a known field
- **THEN** the call returns an error naming that row and no file changes

#### Scenario: Edit rule visible without reading a file
- **WHEN** an agent lists the tools of a propose session
- **THEN** the `suggest_lexicon_change` description names the `edit` action and says the user applies it in the Lexicon tab
