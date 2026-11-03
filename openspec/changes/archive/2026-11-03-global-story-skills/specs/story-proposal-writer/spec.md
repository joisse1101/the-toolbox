# Spec Delta

## MODIFIED Requirements

### Requirement: Writer script
The toolkit SHALL contain `toolkit/skills/jois-story-propose/write-proposal.mjs`, run with Node from the skill's own folder as `node <skill folder>/write-proposal.mjs <backlog file name>` with the stories as a JSON array on standard input. It SHALL accept the file name only (validated by the file store's name rules) and no output path: the target is always `proposals/<backlog file name>`, and `backlogs/` is only read. It SHALL write nothing unless every story in the input is valid, and SHALL report all problems found in one run, naming each story by its position in the input. A failed run SHALL leave `proposals/` unchanged, and a successful write SHALL not leave a partly written file.

#### Scenario: Valid input
- **WHEN** valid stories are sent for `data-portal.csv`
- **THEN** they are added to `proposals/data-portal.csv` and `backlogs/data-portal.csv` is byte-for-byte unchanged

#### Scenario: Unknown backlog
- **WHEN** the file name does not exist in `backlogs/`
- **THEN** nothing is written and the message says the backlog was not found

#### Scenario: Several problems at once
- **WHEN** story 2 has no Epic and story 3 has 21 points
- **THEN** nothing is written and both problems are reported, each naming its story

#### Scenario: Name rules
- **WHEN** the file name is `../x.csv`
- **THEN** it is rejected and nothing is written

### Requirement: Patches and dependencies name the story's Title
The `jois-story-propose` skill SHALL give, with every patch, `storyTitle`, the current Title of the proposal it changes, and SHALL give every entry of Depends On that names a story of the backlog or `proposed:NEW-<n>` as an object `{id, title}`. The writer SHALL check each pair when one is given and SHALL report a mismatch without writing anything; the report SHALL say what the ID holds now and list the stories that have the given Title (ID, Epic and Feature). The key `title` of a patch keeps its meaning (the new Title). A `NEW-<k>` entry inside the input stays a bare string. The writer SHALL accept an entry given as a bare ID, or a patch without `storyTitle`, as before, and check a Title only when one is given; giving the Title is therefore the skill's duty and checking it is the script's. The check form of the writer (`--check`) SHALL report the same mismatches.

#### Scenario: Patch for a renamed proposal
- **WHEN** a patch names `NEW-8` with `storyTitle` `Export audit log` and `NEW-8` has since been retitled `Export audit trail`
- **THEN** nothing is written and the message says `NEW-8` is now "Export audit trail"

#### Scenario: Rename through a patch
- **WHEN** a patch gives `id` `NEW-8`, `storyTitle` `Export audit log` and `title` `Export audit trail`, and `NEW-8` is titled `Export audit log`
- **THEN** `NEW-8` is retitled `Export audit trail`

#### Scenario: Dependency checked against its Title
- **WHEN** a story lists `{id: "IAM-0001", title: "Sign in"}` and `IAM-0001` has another Title
- **THEN** nothing is written and the message names the story and the entry

#### Scenario: Script from the command line
- **WHEN** the script is run with a bare ID in Depends On and no `storyTitle` on a patch
- **THEN** the input is accepted exactly as before

#### Scenario: Skill supplies the Title
- **WHEN** the skill sends a patch or a dependency on an existing story
- **THEN** it includes that story's current Title next to the ID
