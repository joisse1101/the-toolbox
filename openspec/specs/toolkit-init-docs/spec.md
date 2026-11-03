# toolkit-init-docs Specification

## Purpose

Sets up, in any repository, a docs process where nested pages under `docs/wiki/` are the source of truth, are checked for drift on every pull request, and are mirrored one way to the GitHub wiki.

## Requirements

### Requirement: Docs setup command
The toolkit SHALL include the command `jois-init:docs`, the single file `toolkit/commands/jois-init/docs.md`. It SHALL hide itself from model invocation, declare a narrow `allowed-tools` list and `metadata.version` and `metadata.last_updated`, and work in the project it runs in. The installer SHALL install it with the other `jois-init` commands.

#### Scenario: Command is installed
- **WHEN** the installer runs with global scope and no item name
- **THEN** `~/.claude/commands/jois-init/docs.md` SHALL exist

#### Scenario: Command is hidden and versioned
- **WHEN** `docs.md` lacks `disable-model-invocation: true` or `metadata.version`
- **THEN** the toolkit check SHALL fail and name the file

### Requirement: Check before writing
The command SHALL first check the project (a git repo, a GitHub remote, an existing `docs/wiki/`, a root `CLAUDE.md`, an `openspec/config.yaml`) and report what it found before it writes anything.

#### Scenario: Not a git repository
- **WHEN** the command runs in a folder that is not a git repository
- **THEN** it SHALL say so and write nothing

#### Scenario: Findings reported first
- **WHEN** the command runs in a repo with a `docs/wiki/` folder and no root `CLAUDE.md`
- **THEN** it SHALL report both facts before its first question about a write

### Requirement: Each write asked on its own
The command SHALL ask about each write as its own yes/no question, in plain words, saying why the write is needed and what it changes. It SHALL NOT combine two writes in one question and SHALL NOT write after a no.

#### Scenario: Separate questions
- **WHEN** the command is about to add the checker and the publish workflow
- **THEN** it SHALL ask about them in two separate questions

#### Scenario: A no is respected
- **WHEN** the user answers no to adding the PR template line
- **THEN** the command SHALL leave the PR template untouched and carry on with the next write

### Requirement: Nested docs layout
The command SHALL set up the docs under `docs/wiki/` as pages in nested topic folders, with a hand-written `Home.md` and a generated `_Sidebar.md` at the top of `docs/wiki/`. It SHALL NOT create a flat `wiki/` folder.

#### Scenario: Fresh repo
- **WHEN** the command runs in a repo with no `docs/wiki/` and the user agrees to the skeleton
- **THEN** `docs/wiki/Home.md` and `docs/wiki/_Sidebar.md` SHALL exist and no `wiki/` folder SHALL be created

### Requirement: Re-run replaces in place
Everything the command manages SHALL sit between `jois-init:docs` begin and end marker comments in the file's own comment syntax. A re-run SHALL replace the content between the markers in place and SHALL NOT add a second copy.

#### Scenario: Second run
- **WHEN** the command runs twice in the same repo and the user agrees both times
- **THEN** every managed block SHALL appear exactly once and the second report SHALL show the blocks as replaced or unchanged

#### Scenario: Project text kept
- **WHEN** a file holds text outside the markers
- **THEN** a re-run SHALL leave that text as it was

### Requirement: No silent overwrite
The command SHALL NOT overwrite an existing `CLAUDE.md`, workflow file or PR template that holds no `jois-init:docs` markers without first showing the diff and getting a yes.

#### Scenario: Existing workflow without markers
- **WHEN** `.github/workflows/wiki-publish.yml` exists with different content and no markers
- **THEN** the command SHALL show the diff and ask before changing the file

#### Scenario: Existing CLAUDE.md
- **WHEN** a root `CLAUDE.md` exists
- **THEN** the command SHALL offer the routing-table section as an addition between markers and SHALL NOT rewrite the rest of the file

### Requirement: One-line report
The command SHALL end with a one-line report, in the style of `jois-init:opsx`, stating what was added, replaced, unchanged or skipped.

#### Scenario: Report after a full setup
- **WHEN** the command finishes a setup in which the user agreed to every write
- **THEN** the last line SHALL list each part (checker, builder, workflows, PR line, `CLAUDE.md` routing, OpenSpec guidance) as added, replaced, unchanged or skipped

### Requirement: Setup notes stated
The command SHALL tell the user what the repo needs for publishing to work: the wiki enabled, a first wiki page created once in the web interface, and Actions workflow permission set to read and write. It SHALL also say that publishing deletes every wiki page that is not in `docs/wiki/`.

#### Scenario: Notes after the workflow is added
- **WHEN** the user agrees to the publish workflow
- **THEN** the command SHALL state all four facts before it ends

### Requirement: Recursive docs check
The shipped checker SHALL scan every markdown page under `docs/wiki/` at any depth, plus the root and one-level-nested `CLAUDE.md` files. It SHALL fail and name `file:line` for a relative link that does not resolve, a page not linked from `_Sidebar.md` and `Home.md`, a repo path in inline code that does not exist, and a `CLAUDE.md` over its size limit. A path ignored by git, and a line carrying the ignore marker, SHALL be exempt from the path check.

#### Scenario: Broken link two folders deep
- **WHEN** `docs/wiki/architecture/billing/refunds.md` links to a page that does not exist
- **THEN** the checker SHALL exit with failure and print the page, the line and the link

#### Scenario: Missing code path in a nested page
- **WHEN** a nested page names `` `src/billing/refund.py` `` in inline code and that file does not exist
- **THEN** the checker SHALL exit with failure and name the page, the line and the path

#### Scenario: Orphan nested page
- **WHEN** a nested page is not linked from `_Sidebar.md`
- **THEN** the checker SHALL report it as an orphan

### Requirement: Generated navigation
The shipped builder SHALL generate `_Sidebar.md` and the page list in `Home.md` from the folder tree, grouping pages by folder, and the checker SHALL fail when regenerating them would change the committed files. Only the block between the markers in `Home.md` SHALL be generated.

#### Scenario: New page added
- **WHEN** a page is added under `docs/wiki/architecture/` and the navigation is not regenerated
- **THEN** the checker SHALL fail and say the navigation is out of date

#### Scenario: Hand-written Home text kept
- **WHEN** the builder regenerates the page list
- **THEN** the text of `Home.md` outside the markers SHALL be unchanged

### Requirement: Flattened wiki output
The shipped builder SHALL produce a flat set of pages for the GitHub wiki: each page's path becomes one file name with the folders joined by hyphens, every internal link is rewritten to the target's flat name without `.md`, and anchors are kept. It SHALL refuse to produce output when two pages would get the same flat name.

#### Scenario: Nested page flattened
- **WHEN** the builder runs on `docs/wiki/architecture/billing/refunds.md`
- **THEN** the output SHALL hold `architecture-billing-refunds.md`

#### Scenario: Link rewritten
- **WHEN** `architecture/billing/refunds.md` links to `../orders/lifecycle.md#states`
- **THEN** the output link SHALL point at `architecture-orders-lifecycle#states`

#### Scenario: Name collision
- **WHEN** `docs/wiki/a-b.md` and `docs/wiki/a/b.md` both exist
- **THEN** the builder SHALL fail and name both files

### Requirement: One-way publish
The shipped publish workflow SHALL run on a push to the default branch that changes `docs/wiki/**`, mirror the builder's flat output into the repo's wiki, delete wiki pages that are not in that output, commit as the Actions bot only when something changed, and fail the run when the push fails. It SHALL NOT sync wiki edits back to the repo.

#### Scenario: Unrelated push
- **WHEN** a push to the default branch changes no file under `docs/wiki/`
- **THEN** the workflow SHALL NOT run

#### Scenario: Removed page
- **WHEN** a page is deleted from `docs/wiki/` and the change is pushed
- **THEN** the wiki SHALL no longer hold its flat page after the run

#### Scenario: Nothing changed
- **WHEN** the wiki already matches the output
- **THEN** the workflow SHALL end without a commit

### Requirement: Warning about wiki edits
Before it overwrites the wiki, the publish workflow SHALL list wiki commits that were not made by the Actions bot since its last publish and raise a warning naming them. It SHALL still publish.

#### Scenario: Web edit present
- **WHEN** someone edited a wiki page in the browser after the last publish
- **THEN** the run SHALL show a warning listing that commit and SHALL then overwrite the page

### Requirement: Docs check on every pull request
The shipped docs-check workflow SHALL run the checker on every pull request, not only those that change docs.

#### Scenario: Code rename breaks a path
- **WHEN** a pull request renames a file that a page names in inline code
- **THEN** the docs-check workflow SHALL fail

### Requirement: Pull request checklist line
The command SHALL offer one checklist line for the pull request template: if behavior changed, the affected page in `docs/wiki/` was updated. It SHALL add the line between markers, creating the template when none exists.

#### Scenario: Template exists
- **WHEN** a PR template exists and the user agrees
- **THEN** the line SHALL be added between markers and the template's other text SHALL be unchanged

### Requirement: OpenSpec archive guidance
When the project has an `openspec/config.yaml`, the command SHALL offer archive guidance telling the archiver to update the affected page in `docs/wiki/` first, between `jois-init:docs` markers. It SHALL NOT touch the guidance managed by `jois-init:opsx`.

#### Scenario: Both commands managed
- **WHEN** `openspec/config.yaml` holds `jois-init:opsx` blocks and the user agrees
- **THEN** the new block SHALL sit between its own markers and the `jois-init:opsx` blocks SHALL be unchanged

### Requirement: Shipped scripts are tested
The templates the command ships SHALL include tests for the checker and the builder. The tests SHALL cover a nested page for each check and for flattening, and the toolkit's checks SHALL fail when a template is missing its tests.

#### Scenario: Nested coverage
- **WHEN** the shipped tests run against a minimal tree with a page two folders deep
- **THEN** each check and the flattening SHALL be exercised on that page

### Requirement: Self-contained template package
The templates SHALL ship in one folder under `toolkit/skills/` that holds everything the command copies, so that installing the toolkit by copy gives the command access to them without any other file from the repository.

#### Scenario: Project-scope install
- **WHEN** the installer runs with project scope for the command and for the template skill
- **THEN** the command SHALL find every template in that project's skills folder
