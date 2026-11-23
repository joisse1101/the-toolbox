# Spec Delta

## ADDED Requirements

### Requirement: The story index is a CSV file in the backlog
The story index SHALL be the file `<backlog>/design-index.csv`, with one row per acceptance criterion of each designed story and these columns: `Story ID`, `Story`, `Criterion`, `Kind`, `Artboards`, `Viewports` and `Canvas`. A row is keyed by the story's ID and by the criterion's exact text, as written after its `AC<n>:` label.

#### Scenario: One row per criterion
- **WHEN** a designed story has three criteria
- **THEN** the file holds three rows with that story's ID, in the story's criterion order

#### Scenario: Row columns
- **WHEN** a criterion is a failure case shown on two artboards
- **THEN** its row has `Kind` `failure`, both artboard file stems in `Artboards` separated by `;`, and the canvas link in `Canvas`

### Requirement: Viewports are recorded per row
Each row's `Viewports` column SHALL hold `desktop`, `mobile` or `desktop;mobile`, and the stems in `Artboards` SHALL match it. A design for one viewport only SHALL be recorded as that value on every row of the design.

#### Scenario: Desktop only
- **WHEN** the user asks for a desktop-only design
- **THEN** every row of that design has `Viewports` `desktop` and lists only desktop stems

### Requirement: The index is written only through the design skill's writer
Design SHALL write `design-index.csv` only through a bundled writer script that checks the rows before writing, writes atomically and reads the file back. The writer SHALL refuse a row whose story is not in the backlog (except that a story no longer in the backlog, named with no criteria, has its rows dropped and is reported as gone), a second row for the same story and criterion, a `Kind` other than `main` or `failure`, and an empty `Criterion`. It SHALL have a check mode that writes nothing.

#### Scenario: Row for an unknown story
- **WHEN** the writer is given a row whose story ID is not in the backlog
- **THEN** it refuses, names the row and writes nothing

#### Scenario: Rows of a deleted story
- **WHEN** the writer is given a story ID that is not in the backlog, with an empty criteria list, and the file holds rows for it
- **THEN** it drops those rows and reports that the story is no longer in the backlog and how many rows were dropped

#### Scenario: Check mode
- **WHEN** the writer runs in check mode
- **THEN** it reports what it would write or refuse and the file is unchanged

### Requirement: Design can update the index without redrawing
When the user asks to update the story index, or the stale check reports changed stories and the user chooses an update, design SHALL run an update-index mode. In it, design SHALL rewrite the rows of changed criteria, keep the artboards of an unchanged criterion, drop the rows of a criterion the backlog no longer has, and SHALL NOT publish or change the canvas.

#### Scenario: Criterion reworded
- **WHEN** a criterion's wording changed and its position in the story did not
- **THEN** update mode shows the old and new text, and on a yes rewrites the row with the new text and the same artboards

#### Scenario: Criterion removed
- **WHEN** the backlog no longer has a criterion that the index has
- **THEN** update mode drops that row after the user agrees, and leaves the canvas untouched

#### Scenario: No canvas change
- **WHEN** an update finishes
- **THEN** nothing was published to the canvas

### Requirement: Update mode asks before it writes
Update mode SHALL show every row it would change, add or drop, with the old and new text, and SHALL end that reply with one yes/no question. It SHALL write nothing before the user picks yes. When it cannot tell which new criterion replaces which old one, it SHALL ask the user to pair them and SHALL NOT guess.

#### Scenario: Counts differ
- **WHEN** a story had two criteria in the index and now has three
- **THEN** update mode asks which of the three replaces each old row, and which is new

#### Scenario: User declines
- **WHEN** the user picks "No, change it"
- **THEN** no row is written and the changes are shown again

### Requirement: Update mode warns when a criterion needs a screen
When a criterion is new, or its change probably alters what a screen shows, update mode SHALL say so and SHALL NOT invent artboard stems. It SHALL leave the row without artboards, report it as a coverage problem, and name a full design run as the way to draw it.

#### Scenario: New criterion
- **WHEN** a story gained a criterion that no artboard shows
- **THEN** update mode adds the row with no artboards, reports it as having no artboard, and says a design run must draw the screen

#### Scenario: Frozen story
- **WHEN** a changed criterion belongs to a frozen story
- **THEN** update mode does not rewrite it and says a change needs a superseding story

### Requirement: The first artboard is a cover page
The canvas's first artboard, `Main`, SHALL be a cover page. It SHALL list the canvas's flows and the name of each artboard, with links, and SHALL NOT list acceptance criteria or hold the story index as data. Design SHALL read the story index from `design-index.csv`, never from `Main`.

#### Scenario: Cover opened by a person
- **WHEN** a person opens the canvas
- **THEN** `Main` opens first and lists each flow with links to its artboards

#### Scenario: No criterion text on the canvas
- **WHEN** a story's criterion is reworded
- **THEN** no artboard of the canvas needs to change for the index to be current

### Requirement: The repo keeps a pointer to the canvas and the story index
The skill SHALL record each designed scope in `<backlog>/designs.json` through its writer script, with the scope and the canvas link, and SHALL write the story index to `design-index.csv` through its writer. The repo SHALL hold no artboard content. The skill SHALL read each file back and call it written only when it matches.

#### Scenario: First publish
- **WHEN** the first publish of a canvas succeeds
- **THEN** `designs.json` gains one entry with the scope and the canvas link, `design-index.csv` gains the rows of the designed stories, and nothing else is written to the repo

## MODIFIED Requirements

### Requirement: Design reads only accepted stories
The skill SHALL design only stories in `<backlog>/user-stories.csv`. It SHALL NOT read stories from `proposals.csv` as design input, because the story index is keyed by story ID and a proposed story has no real ID until it is accepted.

#### Scenario: Story still proposed
- **WHEN** the user asks to design a story that is only in `proposals.csv`
- **THEN** the skill says the story must be accepted in the portal first and designs nothing for it

### Requirement: Desktop and mobile artboards by default
By default the skill SHALL draw each screen state twice: a desktop artboard sized for a desktop browser and a mobile artboard sized for a phone. The story index SHALL list both stems for each criterion. The user MAY ask for only one of the two for a design, and the skill SHALL then record that choice in the `Viewports` column.

#### Scenario: Default viewports
- **WHEN** the user does not say which viewports to draw
- **THEN** every screen state has a desktop artboard and a mobile artboard, and each row lists both stems

#### Scenario: Desktop only
- **WHEN** the user says the feature is desktop only
- **THEN** the skill draws only desktop artboards and the rows state that the design is desktop only

### Requirement: No artboard is copied into the repo
No stage of the flow SHALL write an artboard's content or a screenshot of it into the repo or the data folder. A stage that needs an artboard SHALL read it from the canvas when it needs it. A file that a read saves for the moment SHALL go under `.scratch/` and SHALL NOT be committed.

#### Scenario: Agent reads an artboard
- **WHEN** a build agent opens an artboard link
- **THEN** it reads the artboard from the canvas, and `git status` shows no new file outside `.scratch/`

### Requirement: A stale story index is reported
The skill SHALL provide a checker that reads `design-index.csv` itself and compares it with the backlog by story ID and criterion text, and reports each story that is changed, missing or new since the design was made. A story whose ID is gone from the backlog SHALL be reported as missing, and a story in the designed scope with no rows and no open clarification SHALL be reported as new. The checker SHALL change no file.

#### Scenario: Criterion reworded after the design
- **WHEN** a criterion of an indexed story was reworded
- **THEN** the checker reports that story as changed with the old and the new text

#### Scenario: Story renamed after a split
- **WHEN** a split was accepted and a story's ID no longer exists in the backlog
- **THEN** the checker reports that story as missing and the new stories in the scope as new

#### Scenario: Story renumbered
- **WHEN** a story's ID changed and the portal rewrote its rows
- **THEN** the checker reports nothing for it

## REMOVED Requirements

### Requirement: The first artboard is the story index
**Reason**: The story index moves out of the canvas into `design-index.csv`, so it can be read and updated without the Artifact tool and followed by the portal when story IDs change.
**Migration**: A canvas made earlier keeps its `Main` table until the next design run on that scope. That run reads the old index out of `Main` once, with the Artifact tool, writes its rows to `design-index.csv`, and replaces `Main` with the cover page.

### Requirement: The repo keeps only a pointer to the canvas
**Reason**: The repo now also holds `design-index.csv`, so "only a pointer" is no longer true. The replacement requirement, "The repo keeps a pointer to the canvas and the story index", keeps the rule that no artboard content is in the repo.
**Migration**: None. `designs.json` is written exactly as before.
