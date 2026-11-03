## MODIFIED Requirements

### Requirement: Check before writing
The command SHALL first check the project (a git repo, a GitHub remote, an existing `wiki/`, a root `CLAUDE.md`, an `openspec/config.yaml`) and report what it found before it writes anything.

#### Scenario: Not a git repository
- **WHEN** the command runs in a folder that is not a git repository
- **THEN** it SHALL say so and write nothing

#### Scenario: Findings reported first
- **WHEN** the command runs in a repo with a `wiki/` folder and no root `CLAUDE.md`
- **THEN** it SHALL report both facts before its first question about a write

### Requirement: Nested docs layout
The command SHALL set up the docs under `wiki/` at the repo root as pages in nested topic folders, with a hand-written `Home.md` and a generated `_Sidebar.md` at the top of `wiki/`. It SHALL NOT create a `docs/wiki/` folder. The flat pages for the GitHub wiki SHALL be built only in a temporary folder, never in the repo.

#### Scenario: Fresh repo
- **WHEN** the command runs in a repo with no `wiki/` and the user agrees to the skeleton
- **THEN** `wiki/Home.md` and `wiki/_Sidebar.md` SHALL exist and no `docs/wiki/` folder SHALL be created

### Requirement: Setup notes stated
The command SHALL tell the user what the repo needs for publishing to work: the wiki enabled, a first wiki page created once in the web interface, and Actions workflow permission set to read and write. It SHALL also say that publishing deletes every wiki page that is not in `wiki/`.

#### Scenario: Notes after the workflow is added
- **WHEN** the user agrees to the publish workflow
- **THEN** the command SHALL state all four facts before it ends

### Requirement: Recursive docs check
The shipped checker SHALL scan every markdown page under `wiki/` at any depth, plus the root and one-level-nested `CLAUDE.md` files. It SHALL fail and name `file:line` for a relative link that does not resolve, a page not linked from `_Sidebar.md` and `Home.md`, a repo path in inline code that does not exist, and a `CLAUDE.md` over its size limit. A path ignored by git, and a line carrying the ignore marker, SHALL be exempt from the path check.

#### Scenario: Broken link two folders deep
- **WHEN** `wiki/architecture/billing/refunds.md` links to a page that does not exist
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
- **WHEN** a page is added under `wiki/architecture/` and the navigation is not regenerated
- **THEN** the checker SHALL fail and say the navigation is out of date

#### Scenario: Hand-written Home text kept
- **WHEN** the builder regenerates the page list
- **THEN** the text of `Home.md` outside the markers SHALL be unchanged

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
