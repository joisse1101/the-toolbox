# Spec Delta

## MODIFIED Requirements

### Requirement: Plan finds the design of its scope itself
Once the scope is settled, plan SHALL read `<backlog>/design-index.csv` and `<backlog>/designs.json`. When the file holds rows for the stories of the scope, or `designs.json` links a canvas to the scope or to the Epic or Feature that holds it, plan SHALL take the story index from the file, and SHALL tell the user which canvas it uses. The user SHALL NOT have to say where the design is.

#### Scenario: Feature has a design
- **WHEN** the user plans a Feature whose stories have rows in `design-index.csv`
- **THEN** plan names the canvas from the rows, reads the index from the file, and uses it for the rest of the run

#### Scenario: Story inside a designed Feature
- **WHEN** the user plans one story of a Feature that has a design
- **THEN** plan uses the Feature's canvas and only the rows of that story

#### Scenario: Story migrated with its design
- **WHEN** the user plans a story that was migrated into this backlog with its rows
- **THEN** plan names the canvas from the row's `Canvas` and uses the row's artboards

#### Scenario: No Artifact tool
- **WHEN** plan runs in a session with no Artifact tool
- **THEN** it still reads the story index from the file and writes the `Design` lines

### Requirement: Plan stops on a stale design
Plan SHALL run the design checker on the story index before the design checkpoint. When it reports a story in scope as changed, missing or new, plan SHALL name each story by Title, say that the index must be brought up to date with `jois-story-design` (its update-index mode for reworded criteria, a full design run for a story that needs a screen), and stop before drafting, because a link from a stale index could point a task at the wrong screen.

#### Scenario: Story changed since the design
- **WHEN** a story's criterion was reworded after the design was made
- **THEN** plan names the story, points to the update-index mode of `jois-story-design`, and writes nothing

#### Scenario: New story with no rows
- **WHEN** a story in the designed scope has no rows and no open clarification
- **THEN** plan names the story, points to `jois-story-design`, and writes nothing

### Requirement: Plan writes the design links into the tasks
When the scope has a design, plan SHALL give every task that satisfies a criterion with artboards a `Design` line, copying the links the story index gives for that criterion. The writer reads `design-index.csv` itself, so plan SHALL NOT send the story index to it.

#### Scenario: Task built from a screen criterion
- **WHEN** a task satisfies a criterion that the index points to a desktop and a mobile artboard
- **THEN** the task's `Design` line names both artboard links, and the writer checks them against the file
