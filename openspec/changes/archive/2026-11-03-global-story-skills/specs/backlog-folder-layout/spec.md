# Spec Delta

## MODIFIED Requirements

### Requirement: A backlog is named by its folder name
Everywhere a backlog is named (the portal, the file API and the story skills' scripts) it SHALL be named by its folder name, without `.csv`. A name given with a trailing `.csv` SHALL be read as the name without it. A name SHALL follow the same rules as a folder name valid on Windows and SHALL NOT contain a path separator.

#### Scenario: Name with and without extension
- **WHEN** a skill script is given `iam.csv` or `iam`
- **THEN** both mean the backlog `iam`

#### Scenario: Unsafe name
- **WHEN** a request names a backlog such as `../x` or `a/b`
- **THEN** it is rejected and nothing is read or written
