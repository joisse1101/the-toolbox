# plans-file-lifecycle Specification

## Purpose

Says, in one place, which files the story skills and the `jois-code` commands write under the planner's data folder, who writes each one, how long it lives and whether it belongs in git, so a user can set up `.gitignore` before any skill runs.

## Requirements

### Requirement: One table lists every file under the data folder
The toolkit SHALL keep one table of the files written under `<data folder>/<backlog>/`. Each row SHALL give the path pattern, the skill, command or portal that writes it, and one lifecycle: `committed`, `local`, `user decides`, or `removed by archive`. No skill or command SHALL hold its own copy of the table.

#### Scenario: Rows of the table
- **WHEN** the table is read
- **THEN** it lists `user-stories.csv`, `lexicon.csv`, `backlog.json`, `context-map.json`, `context-map.md`, `slices/<slice>/ARCHIVED.md` and `slices/<slice>/source.json` as `committed`
- **AND** `user-stories/proposals.csv`, `user-stories/review.csv`, `user-stories/review.csv.decided` and `lexicon/lexicon-suggestions.csv` as `local`
- **AND** `slices/<slice>/UC-<slice>.md` and `slices/<slice>/tasks.md` as `user decides` and `removed by archive`
- **AND** `slices/<slice>/review.md`, `validation.md` and `validation.partial.md` as `local` and `removed by archive`

#### Scenario: A writer adds a file
- **WHEN** a skill or command starts writing a file under the data folder that the table does not list
- **THEN** the toolkit tests fail until the table lists it

### Requirement: Each skill and command links to the table
The `SKILL.md` of `jois-story-explore`, `jois-story-propose`, `jois-story-review`, `jois-story-plan` and `jois-story-verify`, and the command files of `jois-code:apply`, `jois-code:review`, `jois-code:validate` and `jois-code:archive`, SHALL each name the files it writes and link to the table for their lifecycle. A skill that writes no file SHALL say so.

#### Scenario: Skill that writes nothing
- **WHEN** a reader opens `jois-story-explore`'s `SKILL.md`
- **THEN** it says the skill writes no file and links to the table

#### Scenario: Command that writes a working file
- **WHEN** a reader opens the `jois-code:validate` command file
- **THEN** it names `validation.md` and `validation.partial.md`, says archive removes them, and links to the table

### Requirement: A gitignore block is printed from the table
The plan skill SHALL include a script that prints a `.gitignore` block built from the table. The block SHALL ignore the contents of each folder rather than the folder, and SHALL re-include each `committed` file. It SHALL ignore each `local` file and SHALL re-include each `user decides` file, so it stays untracked until the user commits it. The script SHALL print only and SHALL NOT write any file.

#### Scenario: Block keeps folders re-includable
- **WHEN** the script prints the block
- **THEN** it uses patterns such as `.plans/*/slices/*/*` with `!.plans/*/slices/*/ARCHIVED.md`, and never a bare `.plans/` that would stop a file inside from being re-included

#### Scenario: Status matches the table
- **WHEN** a mock `.plans/` tree holds one file of every row, the printed block is the repo's `.gitignore`, and `git status --porcelain --untracked-files=all` runs
- **THEN** it lists every `committed` and every `user decides` file and no `local` file

#### Scenario: Offered when the data folder is created
- **WHEN** any story skill creates the `.plans` folder with `init-plans.mjs` after the user said yes
- **THEN** the script prints the block after its "Created" line, and the skill tells the user to review it and add it to `.gitignore` themselves
