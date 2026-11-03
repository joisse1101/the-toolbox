# Spec Delta

## MODIFIED Requirements

### Requirement: Writes are logged
Every write by the file API or a story skill's writer script SHALL append one line of JSON to `<dataDir>/logs/writes.jsonl` with the time, the writer (`portal` for the file API, or the name of the writer script), the backlog name, the kind of file, the byte size of the new content and a short hash of it. The log folder SHALL NOT be reachable through the file API. A failure to log SHALL be reported on standard error and SHALL NOT fail or undo the write. The log SHALL hold no file contents.

#### Scenario: Portal save logged
- **WHEN** the portal saves the proposals of backlog `data-portal`
- **THEN** the log gains a line naming writer `portal`, backlog `data-portal`, kind `proposals`, its size and hash

#### Scenario: Writer logged
- **WHEN** a story skill's proposal writer adds stories to backlog `data-portal`
- **THEN** a line names that writer script for that backlog and kind, and a later `portal` line shows who wrote it last

#### Scenario: Log not reachable
- **WHEN** a client asks the file API for `logs`
- **THEN** it is rejected as unknown

#### Scenario: Log failure does not block
- **WHEN** the log file cannot be written
- **THEN** the data write still succeeds and a message appears on standard error
