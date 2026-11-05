## MODIFIED Requirements

### Requirement: Nested docs layout
The command SHALL set up the docs under `wiki/` at the repo root as pages in nested topic folders, with a hand-written `Home.md` and a hand-written `_Sidebar.md` at the top of `wiki/`. It SHALL NOT create a `docs/wiki/` folder. The flat pages for the GitHub wiki SHALL be built only in a temporary folder, never in the repo.

#### Scenario: Fresh repo
- **WHEN** the command runs in a repo with no `wiki/` and the user agrees to the skeleton
- **THEN** `wiki/Home.md` and `wiki/_Sidebar.md` SHALL exist and no `docs/wiki/` folder SHALL be created

### Requirement: Re-run replaces in place
Everything the command manages SHALL sit between `jois-init:docs` begin and end marker comments in the file's own comment syntax, except the starter wiki pages `wiki/Home.md` and `wiki/_Sidebar.md`, which carry no markers because the repo owns them. A re-run SHALL replace the content between the markers in place and SHALL NOT add a second copy. When the content between the markers differs from the template, ignoring line endings, the command SHALL show the diff and ask before replacing it, and SHALL leave the block as it is after a no. A re-run SHALL NOT change an existing starter wiki page.

#### Scenario: Second run
- **WHEN** the command runs twice in the same repo and the user agrees both times
- **THEN** every managed block SHALL appear exactly once and the second report SHALL show the blocks as replaced or unchanged

#### Scenario: Project text kept
- **WHEN** a file holds text outside the markers
- **THEN** a re-run SHALL leave that text as it was

#### Scenario: Block edited by hand
- **WHEN** the content between the markers differs from the template
- **THEN** the command SHALL show the diff and ask before replacing it

#### Scenario: Replacement declined
- **WHEN** the user answers no to replacing a block that differs from the template
- **THEN** the block SHALL be left as it is and the report SHALL show the part as `skipped (declined)`

#### Scenario: Starter pages edited by hand
- **WHEN** the command runs again in a repo whose `wiki/Home.md` and `wiki/_Sidebar.md` were edited
- **THEN** both files SHALL be unchanged and the command SHALL NOT ask about them

#### Scenario: Old script block replaced
- **WHEN** an installed script holds the generator from an earlier version between its markers
- **THEN** the command SHALL show the diff against the current template and ask before replacing the block

### Requirement: Recursive docs check
The shipped checker SHALL scan every markdown page under `wiki/` at any depth, plus the root and one-level-nested `CLAUDE.md` files. It SHALL fail and name `file:line` for a relative link that does not resolve, a page not linked from `_Sidebar.md`, a page linked more than once from `_Sidebar.md`, a sidebar that links `Home.md`, a page not linked from `Home.md`, a link in a `CLAUDE.md` that points under `wiki/` to a file that does not exist, a repo path in inline code that does not exist, and a `CLAUDE.md` over its size limit. A path ignored by git, and a line carrying the ignore marker, SHALL be exempt from the path check. A page missing from the sidebar SHALL be reported once.

#### Scenario: Broken link two folders deep
- **WHEN** `wiki/architecture/billing/refunds.md` links to a page that does not exist
- **THEN** the checker SHALL exit with failure and print the page, the line and the link

#### Scenario: Missing code path in a nested page
- **WHEN** a nested page names `` `src/billing/refund.py` `` in inline code and that file does not exist
- **THEN** the checker SHALL exit with failure and name the page, the line and the path

#### Scenario: Orphan nested page
- **WHEN** a nested page is linked from `_Sidebar.md` but not from `Home.md`
- **THEN** the checker SHALL report it as an orphan of `Home.md`

#### Scenario: Page missing from the sidebar
- **WHEN** a nested page is linked from `Home.md` but not from `_Sidebar.md`
- **THEN** the checker SHALL report it once, naming the page and `_Sidebar.md`

#### Scenario: Broken wiki link in a nested CLAUDE.md
- **WHEN** `src/CLAUDE.md` links `../wiki/Missing.md` and that file does not exist
- **THEN** the checker SHALL exit with failure and name `src/CLAUDE.md`, the line and the link

## ADDED Requirements

### Requirement: Hand-written sidebar kept complete
The shipped checker SHALL require every page under `wiki/` except `Home.md` and `_Sidebar.md` to be linked exactly once from `_Sidebar.md`, SHALL require every link in `_Sidebar.md` to resolve to a page, and SHALL NOT require `Home.md` or `_Sidebar.md` to match any generated text. The shipped builder SHALL NOT write or regenerate either file and SHALL NOT offer an option to do so.

#### Scenario: Page listed twice
- **WHEN** a page is linked twice from `_Sidebar.md`
- **THEN** the checker SHALL exit with failure and name the page and the sidebar

#### Scenario: Broken sidebar link
- **WHEN** `_Sidebar.md` links `architecture/gone.md` and that page does not exist
- **THEN** the checker SHALL exit with failure and name `wiki/_Sidebar.md`, the line and the link

#### Scenario: Sidebar links Home
- **WHEN** `_Sidebar.md` links `Home.md`
- **THEN** the checker SHALL exit with failure and name the sidebar

#### Scenario: Reading order kept
- **WHEN** the sidebar lists its pages in an order that is not alphabetical and every page is linked once
- **THEN** the checker SHALL pass

#### Scenario: Old generated sidebar fails once
- **WHEN** a repo on an earlier version keeps its generated sidebar, which links `Home.md`
- **THEN** the checker SHALL fail on the Home link only, and SHALL pass once that one line is removed

### Requirement: Starter wiki pages
The command SHALL ship a starter `wiki/Home.md` and a starter `wiki/_Sidebar.md` as template files with no markers and no generated block. It SHALL write each only when it is missing and SHALL state that the repo edits them by hand. The starter wiki SHALL be flat, with the pages directly in `wiki/`. The starter files SHALL pass the shipped checker without edits. The routing table in the `CLAUDE.md` starter SHALL link only pages the starter wiki holds.

#### Scenario: Starter passes the checker
- **WHEN** the command writes the starter pages in a repo with no `wiki/` and the checker runs
- **THEN** the checker SHALL print its one-line pass

#### Scenario: Existing Home kept
- **WHEN** `wiki/Home.md` already exists and `wiki/_Sidebar.md` does not
- **THEN** the command SHALL write only `wiki/_Sidebar.md` and leave `Home.md` unchanged

## REMOVED Requirements

### Requirement: Generated navigation
**Reason**: A generated list is alphabetical, mixes section prefixes and cannot express a reading order. Adding an ordering scheme would cost more than keeping a short link list by hand, so the checker keeps a hand-written sidebar complete instead.
**Migration**: A repo on an earlier version re-runs the command, accepts the replacement of the script blocks and keeps its generated `_Sidebar.md` and the generated block in `Home.md` as ordinary hand-written text. It deletes the `Home` line from `_Sidebar.md`, which the new checker rejects, and may delete the marker lines of the generated block.
