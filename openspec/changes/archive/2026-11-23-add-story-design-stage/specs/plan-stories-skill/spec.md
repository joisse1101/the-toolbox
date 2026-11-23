# Spec Delta

## ADDED Requirements

### Requirement: Plan finds the design of its scope itself
Once the scope is settled, plan SHALL read `<backlog>/designs.json`. When it links a canvas to the scope, or to the Epic or Feature that holds the scope, plan SHALL open that canvas's story index and SHALL tell the user which canvas it uses. The user SHALL NOT have to say where the design is.

#### Scenario: Feature has a design
- **WHEN** the user plans a Feature whose scope has an entry in `designs.json`
- **THEN** plan names the canvas, reads its story index, and uses it for the rest of the run

#### Scenario: Story inside a designed Feature
- **WHEN** the user plans one story of a Feature that has a design
- **THEN** plan uses the Feature's canvas and only the index entries of that story

### Requirement: Plan mentions a missing design once
When `designs.json` links no canvas to the scope and the scope's flows include a screen, plan SHALL say once that no design was found and name `jois-story-design`, then carry on without design links. Plan SHALL NOT stop for a missing design, because a scope may need none.

#### Scenario: Screen flow with no design
- **WHEN** the scope has a sign-in screen and no design entry
- **THEN** plan says no design was found, names `jois-story-design`, and drafts the slice with no `Design` lines

### Requirement: Plan stops on a stale design
Plan SHALL run the design checker on the story index before the design checkpoint. When it reports a story in scope as changed, missing or new, plan SHALL name each story by Title, say that the design must be run again with `jois-story-design`, and stop before drafting, because a link from a stale index could point a task at the wrong screen.

#### Scenario: Story changed since the design
- **WHEN** a story's criterion was reworded after the design was made
- **THEN** plan names the story, points to `jois-story-design`, and writes nothing

### Requirement: Plan uses the artboards as a source
Plan SHALL treat the artboards a criterion points to as a source for the slice, next to the stories, the lexicon and the code. A decision an artboard settles, such as an error message's text or a field's order, SHALL NOT be asked again at the design checkpoint, and its decision row SHALL cite the artboard link.

#### Scenario: Error text shown on an artboard
- **WHEN** an error-state artboard shows the message for a taken name
- **THEN** plan draws that message in the failure branch, cites the artboard, and does not ask the user for the text

#### Scenario: Artboard contradicts a criterion
- **WHEN** an artboard shows a behaviour that its criterion does not describe
- **THEN** plan reports the difference as a finding and asks the user which one holds, and draws nothing of it before the answer

### Requirement: Plan writes the design links into the tasks
When the scope has a design, plan SHALL give every task that satisfies a criterion with artboards a `Design` line, copying the links the story index gives for that criterion. It SHALL send the story index to the writer with the slice, so that the writer can check the links.

#### Scenario: Task built from a screen criterion
- **WHEN** a task satisfies a criterion that the index points to a desktop and a mobile artboard
- **THEN** the task's `Design` line names both artboard links

### Requirement: Plan and design share one rule for story changes
Plan SHALL take its rules for splitting a story, for leaving out a story that is not ready, and for conflicts between stories from the shared story-changes guideline that `jois-story-design` also reads. Plan's own `SKILL.md` SHALL cite that guideline and SHALL NOT restate it.

#### Scenario: Rule changes in one place
- **WHEN** the readiness rule in the shared guideline changes
- **THEN** both plan and design follow the changed rule with no edit to either `SKILL.md`
