## MODIFIED Requirements

### Requirement: Validation before writing
The slice writer SHALL apply the same checks of `diagram-conventions` with and without `--check`, including Mermaid's own parser on every `mermaid` block, and report every problem found, each naming the document and the heading, line or story. It SHALL read the mode of a slice from the document's Maturity row, and apply the greenfield checks when it reads `planned (greenfield)`. With `--check` it writes nothing. One failing diagram or section SHALL write nothing of the slice. When a check fails because a code-bound section reads other than `TBC`, or a file path appears, in a slice that is not in greenfield mode, the error text SHALL say that a story which builds the code from scratch uses greenfield mode and name the section of the conventions that defines it. When the packages the Mermaid parser needs are not installed in the skill's folder, the writer SHALL refuse, name the folder and say to run `npm ci` there, and SHALL NOT skip the check.

#### Scenario: One bad file
- **WHEN** the document fails a check, in one diagram or in one section
- **THEN** nothing is written and the reply lists each problem with the heading of its diagram or section

#### Scenario: Parser error reported
- **WHEN** a block does not parse
- **THEN** the reply carries the parser's message and the line within the block

#### Scenario: Build plan rejected outside greenfield mode
- **WHEN** a slice with Maturity `planned` has a build plan in its Implementation overview
- **THEN** the error says the section must read `TBC` and that a slice building the code from scratch uses greenfield mode

#### Scenario: Mode follows the document
- **WHEN** the same document is sent with `--check` and then without it
- **THEN** both runs apply the greenfield checks, because the mode is read from the Maturity row and not from a flag
