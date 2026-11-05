# toolkit-init-docs Specification

## Purpose

Sets up, in any repository, a docs process where nested pages under `wiki/` are the source of truth, are checked for drift on every pull request, and are mirrored one way to the GitHub wiki.

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
The command SHALL first check the project (a git repo, a GitHub remote, an existing `wiki/`, a root `CLAUDE.md`, an `openspec/config.yaml`) and report what it found before it writes anything.

#### Scenario: Not a git repository
- **WHEN** the command runs in a folder that is not a git repository
- **THEN** it SHALL say so and write nothing

#### Scenario: Findings reported first
- **WHEN** the command runs in a repo with a `wiki/` folder and no root `CLAUDE.md`
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
The command SHALL tell the user what the repo needs for publishing to work: the wiki enabled, a first wiki page created once in the web interface, and Actions workflow permission set to read and write. It SHALL also say that publishing deletes every wiki page that is not in `wiki/`.

#### Scenario: Notes after the workflow is added
- **WHEN** the user agrees to the publish workflow
- **THEN** the command SHALL state all four facts before it ends

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

### Requirement: Flattened wiki output
The shipped builder SHALL produce a flat set of pages for the GitHub wiki: each page's path under `wiki/` becomes one file name with the folders joined by hyphens, every internal link is rewritten to the target's flat name without `.md`, and anchors are kept. It SHALL refuse to produce output when two pages would get the same flat name.

#### Scenario: Nested page flattened
- **WHEN** the builder runs on `wiki/architecture/billing/refunds.md`
- **THEN** the output SHALL hold `architecture-billing-refunds.md`

#### Scenario: Link rewritten
- **WHEN** `architecture/billing/refunds.md` links to `../orders/lifecycle.md#states`
- **THEN** the output link SHALL point at `architecture-orders-lifecycle#states`

#### Scenario: Name collision
- **WHEN** `wiki/a-b.md` and `wiki/a/b.md` both exist
- **THEN** the builder SHALL fail and name both files

### Requirement: One-way publish
The shipped publish workflow SHALL run on a push to the default branch that changes `wiki/**`, mirror the builder's flat output into the repo's wiki, delete wiki pages that are not in that output, commit as the Actions bot only when something changed, and fail the run when the push fails. It SHALL NOT sync wiki edits back to the repo.

#### Scenario: Unrelated push
- **WHEN** a push to the default branch changes no file under `wiki/`
- **THEN** the workflow SHALL NOT run

#### Scenario: Removed page
- **WHEN** a page is deleted from `wiki/` and the change is pushed
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
The command SHALL offer one checklist line for the pull request template: if behavior changed, the affected page in `wiki/` was updated. It SHALL add the line between markers, creating the template when none exists.

#### Scenario: Template exists
- **WHEN** a PR template exists and the user agrees
- **THEN** the line SHALL be added between markers and the template's other text SHALL be unchanged

### Requirement: OpenSpec archive guidance
When the project has an `openspec/config.yaml`, the command SHALL offer archive guidance telling the archiver to update the affected page in `wiki/` first, between `jois-init:docs` markers. It SHALL NOT touch the guidance managed by `jois-init:opsx`.

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

### Requirement: Publish workflow runs the builder
The shipped checker SHALL fail when `.github/workflows/wiki-publish.yml` exists and no non-comment line in it runs `build_wiki.py` with `--out`. It SHALL name `file:line` and say that `.md` links would reach the wiki unrewritten. It SHALL pass when the file does not exist, and it SHALL NOT depend on which folder holds the scripts.

#### Scenario: Shipped workflow passes
- **WHEN** the checker runs against the shipped `wiki-publish.yml`
- **THEN** the workflow check SHALL pass

#### Scenario: Plain copy of wiki/
- **WHEN** the workflow copies `wiki/` with `rsync` and has no step that runs `build_wiki.py --out`
- **THEN** the checker SHALL exit with failure and name the workflow file and the missing builder

#### Scenario: Builder named only in a comment
- **WHEN** `build_wiki.py --out` appears only on a comment line of the workflow
- **THEN** the checker SHALL exit with failure

#### Scenario: No publish workflow
- **WHEN** the repo has no `.github/workflows/wiki-publish.yml`
- **THEN** the workflow check SHALL pass

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
