## ADDED Requirements

### Requirement: Writes are logged
Every write to a registered data folder SHALL append one line of JSON to `data/logs/writes.jsonl` with the time, the writer (`portal` for the file API, or the name of the script or tool), the store, the file name, the byte size of the new content and a short hash of it. The log folder SHALL NOT be a registered store, so the file API cannot reach it. A failure to log SHALL be reported on standard error and SHALL NOT fail or undo the write. The log SHALL hold no file contents.

#### Scenario: Portal save logged
- **WHEN** the portal saves `proposals/data-portal.csv`
- **THEN** `data/logs/writes.jsonl` gains a line naming writer `portal`, store `proposals`, that file, its size and hash

#### Scenario: Writer logged
- **WHEN** `write_proposals` adds stories to `proposals/data-portal.csv`
- **THEN** a line names writer `write_proposals` for that file, and a later `portal` line for the same file shows who wrote it last

#### Scenario: Log not reachable
- **WHEN** a client asks the file API for the `logs` store
- **THEN** it is rejected as an unknown store

#### Scenario: Log failure does not block
- **WHEN** the log file cannot be written
- **THEN** the data write still succeeds and a message appears on standard error
