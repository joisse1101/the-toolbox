## ADDED Requirements

### Requirement: Stories are named by Title
In everything the user reads, `explore-stories`, `propose-stories`, `/story:propose` and the summaries they give SHALL name a story by its Title, in quotes, adding its Epic and Feature when another story has the same Title. An ID SHALL NOT be the only name of a story; it MAY follow the Title in parentheses where the user needs the portal's label (for example the `NEW-<n>` a writer assigned). This holds for dependencies, patches, edits to backlog stories, the confirmation text and the final report. The skills SHALL look an ID up in the `index` or `proposals` section themselves and SHALL NOT ask the user for one. A user who names a story by words, or by a Title that is no longer exact, SHALL be matched against the Titles read from the files; when two or more stories fit, the skill SHALL list them (Title, Epic, Feature) and ask which is meant.

When a `story-tools` call is answered with a Title mismatch (see `story-tools-mcp`), the skill SHALL relocate the story from the candidates the reply lists, or from the `index`, read it again with `read_context`, and repeat the call with the ID and Title it found. It SHALL ask the user only when the candidates cannot be told apart or the Title is found nowhere, and SHALL say, in the report, that a story had moved and which Title it was found under. It SHALL NOT send a call again with the same ID and Title that was refused.

#### Scenario: Draft names stories by Title
- **WHEN** the skill shows a patch for `NEW-8`
- **THEN** the draft reads "Export audit log" with the old and new value of the field, and `NEW-8` appears at most in parentheses after the Title

#### Scenario: Dependency shown by Title
- **WHEN** a draft depends on `IAM-0001` titled "Sign in"
- **THEN** the draft says it depends on "Sign in"

#### Scenario: Two stories with one Title
- **WHEN** "Sign in" exists under two Features
- **THEN** the draft says "Sign in" with the Epic and Feature of the one meant

#### Scenario: Story moved after a renumber
- **WHEN** `write_review` answers that `IAM-0004` is now another story and lists `IAM-0006` with the Title
- **THEN** the skill reads `IAM-0006`, repeats the call with `IAM-0006` and its Title, and the report says the story was found under its new ID

#### Scenario: Title nowhere
- **WHEN** the reply says no story has the Title
- **THEN** the skill reads the `index`, and if it still cannot tell which story is meant it asks the user, and writes nothing meanwhile

#### Scenario: User names a story loosely
- **WHEN** the user says "the password reset one" and one Title in the `index` fits
- **THEN** the skill uses that story and shows its exact Title in the draft

## MODIFIED Requirements

### Requirement: Shape-stories launcher collects backlog and story
`ai/launchers/shape-stories.ps1` SHALL accept an optional backlog (with or without `.csv`) and an optional story: one argument, either a `NEW-<n>` ID, a story ID of the backlog, or free text. For each one not given it SHALL prompt the user itself, listing the backlogs found in `user-stories/` for the backlog. It SHALL reject an unknown backlog, an empty story, a `NEW-<n>` that is not in `proposals/<backlog file name>`, and a story ID of the backlog's form (letters, a dash and digits, such as `IAM-0004`) that is not in `user-stories/<backlog file name>`, before starting Claude. It SHALL start `/explore-stories` with the backlog file name and the story in the opening prompt, so the skill does not ask for them, with the `story-tools` server (all four tools) and without `Bash`. When the story is a `NEW-<n>` or a story ID of the backlog, the opening prompt SHALL also carry that story's Title, read from the file, so that the session names the story by Title from its first reply. `ai/launchers/explore-stories.ps1` SHALL start the server with `--read-only`.

#### Scenario: Both given
- **WHEN** the user runs `shape-stories.ps1 data-portal NEW-57` and `NEW-57` is in `proposals/data-portal.csv`
- **THEN** no prompt is shown and the session opens on `data-portal.csv` with `NEW-57` and its Title as the story

#### Scenario: Backlog story given
- **WHEN** the user runs `shape-stories.ps1 data-portal IAM-0004` and `IAM-0004` is in `user-stories/data-portal.csv`
- **THEN** no prompt is shown and the session opens on `data-portal.csv` with `IAM-0004` and its Title as the story

#### Scenario: Free text story
- **WHEN** the user runs `shape-stories.ps1 data-portal "a new keyboard"`
- **THEN** the session opens on `data-portal.csv` with "a new keyboard" as the story

#### Scenario: No arguments
- **WHEN** the user runs `shape-stories.ps1` with no arguments
- **THEN** the script shows a numbered list of the backlogs, reads the choice, reads the story, and then starts Claude with both

#### Scenario: Unknown backlog
- **WHEN** the backlog does not exist in `user-stories/`
- **THEN** the script reports it and starts nothing

#### Scenario: Proposal not in this backlog
- **WHEN** the story is `NEW-99` and `proposals/data-portal.csv` has no such ID
- **THEN** the script reports it and starts nothing

#### Scenario: Backlog story not in this backlog
- **WHEN** the story is `IAM-9999` and `user-stories/data-portal.csv` has no such ID
- **THEN** the script reports it and starts nothing

#### Scenario: Tools of the session
- **WHEN** `shape-stories.ps1` starts Claude
- **THEN** the tool list is `Skill`, `AskUserQuestion` and the four `story-tools` tools, with `--strict-mcp-config`
