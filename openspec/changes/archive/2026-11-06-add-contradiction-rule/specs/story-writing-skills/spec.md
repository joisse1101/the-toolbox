# Spec Delta

## ADDED Requirements

### Requirement: Explore and propose follow the contradiction rule
`jois-story-explore` and `jois-story-propose` SHALL apply the rule of the `story-contradiction-rule` capability to every new or changed story they draft, and SHALL cite that rule in their `SKILL.md` instead of restating it. Both SHALL run the check before they show drafts as ready.

#### Scenario: Contradiction found before drafts are shown
- **WHEN** a drafted story contradicts a wiki page
- **THEN** the skill reports it and asks which one stands before it shows the draft as ready

#### Scenario: Rule stated once
- **WHEN** the contradiction rule changes
- **THEN** only the `story-contradiction-rule` spec and the skills' citation of it change

### Requirement: Explore and propose may read files directly
`jois-story-explore` and `jois-story-propose` SHALL be allowed `Read`, `Grep` and `Glob`, and SHALL still read backlog data through `read-story-context.mjs` by default. They SHALL use the file tools for wiki pages and for data the script's caps cut off, and SHALL NOT use them to write. `jois-story-explore` SHALL remain unable to write any file.

#### Scenario: Backlog story is read
- **WHEN** the skill needs one backlog story
- **THEN** it reads it with `read-story-context.mjs`, not with a direct file read

#### Scenario: Wiki page is read
- **WHEN** the skill needs a wiki page
- **THEN** it reads it with `Read` or `Grep`

#### Scenario: Explore still writes nothing
- **WHEN** `jois-story-explore` runs
- **THEN** its tools hold no way to write a file

### Requirement: Propose writes the contradiction record with the story
`jois-story-propose` SHALL show the `Changes existing spec` and `Supersedes` Notes lines in the complete draft of the new story, include them in the one yes/no question, and write them in the story's Notes field only through the existing proposals writer. It SHALL NOT write to `wiki/`.

#### Scenario: Notes line shown and written
- **WHEN** the user decides a new story stands over a wiki page and confirms the drafts
- **THEN** the draft showed the Notes line before the question, and the proposals row's Notes holds it after the read-back

#### Scenario: Wiki untouched
- **WHEN** a story with a `Changes existing spec` line is written
- **THEN** no file under `wiki/` has changed
