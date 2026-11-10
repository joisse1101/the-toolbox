## ADDED Requirements

### Requirement: Verify can be called by the plan skill
When `jois-story-plan` calls `jois-story-verify` on a slice it just wrote, verify SHALL run all nine checks as when a user runs it, and SHALL return its findings ranked critical, warning or suggestion, each with its fix and owner. It SHALL apply no slice correction itself in that call: the calling plan skill makes the correction through the plan writer, which already has the user's yes/no. It SHALL write no review row and SHALL NOT offer one in that call; story findings are returned for the caller's report. When a user runs verify directly, it SHALL behave as before, with its own approval for each write.

#### Scenario: Called by plan
- **WHEN** plan calls verify after a slice write
- **THEN** verify runs every check, returns the ranked findings, and writes nothing

#### Scenario: Run by the user
- **WHEN** the user runs `/jois-story:verify`
- **THEN** verify reports and offers each fix with its own yes/no, as before
