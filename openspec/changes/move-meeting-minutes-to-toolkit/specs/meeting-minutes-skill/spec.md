## REMOVED Requirements

### Requirement: Minutes from pasted notes
**Reason**: The planner no longer has a meeting-minutes feature.
**Migration**: Use `/jois-docs:meeting-minutes`, specified in `toolkit-meeting-minutes` (Minutes from notes).

### Requirement: Gaps are asked, never invented
**Reason**: The planner no longer has a meeting-minutes feature.
**Migration**: Same rule in `toolkit-meeting-minutes` (Gaps are asked, never invented).

### Requirement: Attribution only from the notes
**Reason**: The planner no longer has a meeting-minutes feature.
**Migration**: Same rule in `toolkit-meeting-minutes` (Attribution only from the notes).

### Requirement: Action-item defaults
**Reason**: The planner no longer has a meeting-minutes feature.
**Migration**: Same rule in `toolkit-meeting-minutes` (Action-item defaults).

### Requirement: Save only after confirmation
**Reason**: The planner no longer has a meeting-minutes feature.
**Migration**: See `toolkit-meeting-minutes` (Save is offered and confirmed). Saving no longer goes through a writer script.

### Requirement: Writer script
**Reason**: The toolkit command writes the file itself, so the Node writer, its guard and the launcher are deleted.
**Migration**: None. Nothing else called the writer.

### Requirement: New file by default
**Reason**: The planner no longer has a meeting-minutes feature.
**Migration**: See `toolkit-meeting-minutes` (No silent overwrite).

### Requirement: Refinement replaces a named file
**Reason**: The planner no longer has a meeting-minutes feature.
**Migration**: See `toolkit-meeting-minutes` (Refinement updates a referenced minutes file). The user references the file instead of naming it to a writer.

### Requirement: Private, outside the CSV stores
**Reason**: Minutes no longer live in `planner/data/meetings/`, so the planner has no `meetings` folder to keep private.
**Migration**: Existing files in `planner/data/meetings/` stay where they are, untouched by this change. Move them by hand if wanted.
