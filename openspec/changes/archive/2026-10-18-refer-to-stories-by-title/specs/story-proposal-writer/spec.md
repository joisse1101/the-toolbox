## ADDED Requirements

### Requirement: Patches and dependencies name the story's Title
When the writer is called through the `story-tools` server, a patch SHALL carry `storyTitle`, the current Title of the proposal it changes, and an entry of Depends On that names a story of the backlog or `proposed:NEW-<n>` SHALL be an object `{id, title}`; the pair SHALL be checked as the `story-tools-mcp` capability describes, and a mismatch SHALL be reported without writing anything. The key `title` of a patch keeps its meaning (the new Title). A `NEW-<k>` entry inside the input stays a bare string. When the script is run from the command line these keys are optional: an entry given as a bare ID, or a patch without `storyTitle`, is accepted as before, and a Title that is given is checked. The check form of the writer SHALL report the same mismatches.

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
