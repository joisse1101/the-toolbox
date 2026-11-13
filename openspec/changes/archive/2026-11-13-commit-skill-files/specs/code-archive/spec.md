## MODIFIED Requirements

### Requirement: A rerun replaces in place
Rerunning archive for the same slice SHALL replace that slice's marked sections and its source row in place, and SHALL NOT add a second copy. Text outside the marked sections SHALL stay as it is. A slice whose folder holds `ARCHIVED.md` and no `tasks.md` has been reduced to its record and SHALL NOT be archived again: archive SHALL say it was archived on the date `ARCHIVED.md` names and SHALL write nothing.

#### Scenario: Second run
- **WHEN** a slice already archived is archived again after a redraw
- **THEN** its sections and row are replaced and the page holds one copy

#### Scenario: Slice already reduced
- **WHEN** archive is run on a slice whose folder holds only `ARCHIVED.md` and `source.json`
- **THEN** archive says the slice was archived on the date in `ARCHIVED.md`, that its working files are gone, and writes nothing

### Requirement: Archive commits only through the commit rule
Archive SHALL stage by explicit path and stop at the confirmation word of the commit rule, and SHALL NOT push. Archiving a slice is one concern: the wiki pages, the slice's `ARCHIVED.md` and `source.json`, and the deletions of its tracked working files SHALL be staged together for one commit. Archive SHALL NOT stage a file the project's `.gitignore` ignores. It SHALL end with one line that counts the pages added, replaced, unchanged and skipped.

#### Scenario: Ends at the word
- **WHEN** the pages are written and checked and the slice is reduced
- **THEN** archive stages the wiki pages, `ARCHIVED.md`, `source.json` and the deletions by explicit path, prints the staged summary and the proposed message `docs(wiki): archive <backlog>/<slice>`, names one confirmation word and ends its turn

#### Scenario: Slice record ignored by git
- **WHEN** the project's `.gitignore` ignores `ARCHIVED.md`
- **THEN** archive stages only the wiki pages and says the slice record stays local

## REMOVED Requirements

### Requirement: The slice is marked archived and kept
**Reason**: Archive now reduces the slice folder to its record instead of keeping every working file, so the same facts are not held in `.plans/` and in the wiki.
**Migration**: See "The slice is reduced to its record". A slice archived before this change keeps all its files; running archive on it again works as before, and the reduction is offered at the end of that run.

## ADDED Requirements

### Requirement: The slice record carries the review and validation summary
After the wiki pages pass their check, archive SHALL write `ARCHIVED.md` with the date, commit, review answer, stories and pages, plus a validation summary (tested commit and claim counts by verdict) and a review summary (status, reviewed commit, fix rounds, which checks ran). It SHALL carry the known, not fixed and not fixed by design lines of `review.md` verbatim, or one link to the wiki section they were moved to. A line whose fact a wiki section already states SHALL be written as one link to that section, `See [<heading>](<path>#<anchor>)`, and not as the line, so no fact is written both in `ARCHIVED.md` and in the wiki.

#### Scenario: Record after a full run
- **WHEN** archive marks a slice whose `validation.md` says 12 claims met and whose `review.md` lists one known, not fixed line
- **THEN** `ARCHIVED.md` shows the tested commit, `12 met, 0 not met, 0 could not test`, the review status and that one line

#### Scenario: Known lines moved into the wiki
- **WHEN** the user chose to add the known, not fixed lines to the slice's block in `design.md`
- **THEN** `ARCHIVED.md` holds one link to that section and not the lines themselves

### Requirement: Review facts the wiki lacks are offered before the delete
Before the delete, archive SHALL show the known, not fixed and not fixed by design lines of `review.md` and the `could not test` claims of `validation.md`, and ask once whether to add them as a `### Known limits` section in the slice's block of `design.md` or keep them only in `ARCHIVED.md`. It SHALL skip a line the wiki already states, found by meaning and not by exact text: it searches `wiki/` for the line's key terms, reads the section around each hit, and counts the line as stated when that section says the same fact in any words. It SHALL record the wiki page and heading that state each such line, and show the section as a diff before writing.

#### Scenario: Known line the wiki already states (reworded)
- **WHEN** a known, not fixed line of `review.md` states a fact that a wiki section already states in other words
- **THEN** archive does not offer it, and `ARCHIVED.md` holds a link to that wiki section instead of the line

#### Scenario: Nothing to carry
- **WHEN** both lists say `none` and no claim is `could not test`
- **THEN** archive asks nothing and goes on to the delete

#### Scenario: User adds the section
- **WHEN** the user picks "Add to the wiki"
- **THEN** archive shows the `### Known limits` diff, writes it after the user approves it, reruns the docs check, and links it from `ARCHIVED.md`

### Requirement: The slice is reduced to its record
After `ARCHIVED.md` is written and read back, archive SHALL list the working files present (`UC-<slice>.md`, `tasks.md`, `review.md`, `validation.md`, `validation.partial.md`) and delete them only after the user picks "Delete them", saying first when any is untracked by git and so cannot be restored. It SHALL keep `ARCHIVED.md`, `source.json` and any other file, and SHALL NOT edit a story.

#### Scenario: Files untracked
- **WHEN** the slice folder has never been committed
- **THEN** the question says the delete is permanent, and on "Delete them" only `ARCHIVED.md` and `source.json` remain

#### Scenario: Files tracked
- **WHEN** the working files are tracked by git
- **THEN** the question says the files can be restored from git, and the deletions are staged with the wiki pages in the archive commit

#### Scenario: User keeps the files
- **WHEN** the user picks "Keep them"
- **THEN** archive deletes nothing, says the slice is archived with its working files kept, and a later run offers the delete again

#### Scenario: An unknown file in the folder
- **WHEN** the slice folder holds a file not in the list, such as `notes.md`
- **THEN** archive names it, keeps it, and does not delete it
