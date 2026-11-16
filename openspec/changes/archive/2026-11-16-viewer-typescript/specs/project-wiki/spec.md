# Spec Delta

## MODIFIED Requirements

### Requirement: Paths are written from the repo root
A repo path in inline code on a wiki page or in a `CLAUDE.md` SHALL be written from the repo root, never relative to a sub-folder.

#### Scenario: A moved file path
- **WHEN** an architecture page names the CSV parser
- **THEN** it SHALL write `viewer/shared/backlog/csv.ts` and not `backlog/csv.ts`
