# Spec Delta

## Purpose

Gives Claude a reusable set of visual-design rules, condensed from *Refactoring UI*, and structure rules for frontend code, that it applies when it designs, builds, styles or reviews a user interface, so the output looks designed and its code is grouped and easy to work with.

## ADDED Requirements

### Requirement: Skill location and identity
The toolkit SHALL ship the skill as `toolkit/skills/jois-design-ui-principles/SKILL.md`. The frontmatter `name` SHALL equal the folder name. It SHALL declare `metadata.version` (semver) and `metadata.last_updated` (a date). The folder SHALL be self-contained, with every support file inside it.

#### Scenario: Docs check passes
- **WHEN** `python check_toolkit.py` runs with the skill present
- **THEN** it reports no problem for the skill

#### Scenario: Copied by hand
- **WHEN** a person copies the skill folder into a tool's skills folder
- **THEN** every reference the skill names is present in the copy

### Requirement: Description states when to use and when not
The `description` SHALL name designing, building, styling, reviewing or polishing a user interface, including writing its frontend code, as the trigger. It SHALL also name what does not trigger the skill: behaviour-only changes and code that has no visual output.

#### Scenario: Visual task
- **WHEN** the user asks for a page, component or layout to be built, styled or cleaned up
- **THEN** the description matches the task

#### Scenario: Non-visual task
- **WHEN** the user asks for a bug fix in a command-line tool or a backend handler
- **THEN** the description does not match the task

### Requirement: Lean entry file with on-demand references
`SKILL.md` SHALL hold the core principles, the rules by topic in one line each and the review checklist. Detail SHALL live in files under `references/`. `SKILL.md` SHALL name each reference file and say when to read it. `SKILL.md` SHALL NOT exceed 150 lines.

#### Scenario: Entry file size
- **WHEN** `SKILL.md` is counted
- **THEN** it has at most 150 lines

#### Scenario: Reference is named
- **WHEN** a reference file exists under `references/`
- **THEN** `SKILL.md` names it and says when to read it

### Requirement: Project tokens come first
The skill SHALL tell Claude to look for the project's existing design tokens (colours, spacing, type, radius, shadow) before using any value of its own. It SHALL tell Claude to use the project's tokens where they exist and to apply the starter values only for what the project lacks.

#### Scenario: Project has colours only
- **WHEN** the project defines colour tokens but no spacing or type scale
- **THEN** Claude uses the project's colours and the starter scales for spacing and type

#### Scenario: Project has no tokens
- **WHEN** the project defines no design tokens
- **THEN** Claude uses the starter tokens and says they are defaults

### Requirement: Starter values are marked and named safely
Every starter value the book does not give (greys, shadows) SHALL be marked as a tunable default. Starter token names SHALL carry a prefix that does not collide with common project names such as `--text` and `--radius`.

#### Scenario: Author-added value
- **WHEN** a starter shadow or grey value is not in the book
- **THEN** the file marks it as a default to tune

### Requirement: Starter text colours meet contrast
Each starter colour the skill assigns to text SHALL meet a contrast ratio of at least 4.5:1 against the starter background it is meant for.

#### Scenario: Tertiary text
- **WHEN** the contrast of the tertiary text colour on the starter background is computed
- **THEN** it is at least 4.5:1

### Requirement: Units rules
The skill SHALL tell Claude to define font sizes in `px` or `rem` and never in `em`. It SHALL give line length in `ch`, 45 to 75.

#### Scenario: Line length
- **WHEN** the skill states the line-length rule
- **THEN** it is written in `ch` and not in `em`

#### Scenario: Font size unit
- **WHEN** the skill states the unit rule
- **THEN** the ban on `em` applies to font sizes only

### Requirement: Related elements are grouped in containers
The skill SHALL tell Claude to put related elements in one named container, to build a page from a few named sections and not a flat list of siblings, and to keep the code's nesting in line with the screen (page, section, card, element). It SHALL tell Claude to set `gap`, flex or grid on the container and not margins on each child, and not to position items absolutely to line them up.

#### Scenario: A card with title, text and actions
- **WHEN** Claude writes a card that shows a title, a body and two buttons
- **THEN** the three parts sit inside one card container, and the spacing between them comes from the container

#### Scenario: A list of cards
- **WHEN** Claude writes a row of cards
- **THEN** the cards share one parent container that sets the gap

### Requirement: Semantic elements over stacked divs
The skill SHALL tell Claude to use semantic elements (`section`, `header`, `nav`, `ul`, `form` with `label` and `fieldset`, `button`) where they fit and a plain `div` only when none does.

#### Scenario: A navigation menu
- **WHEN** Claude writes a menu of links
- **THEN** it uses `nav` with a list of links and not a stack of `div`s

#### Scenario: A form field
- **WHEN** Claude writes a form input
- **THEN** it has a `label` and sits inside a `form`

### Requirement: One component per visual unit
The skill SHALL tell Claude to give each visual unit its own component named by its role, and to split a component that mixes layout, data and styling or passes about 100 lines or about 4 levels of JSX nesting. It SHALL tell Claude to use a small layout helper, such as a stack, a row or a grid taking the spacing token, in place of repeated flex rules.

#### Scenario: Long component
- **WHEN** a component Claude is writing passes about 100 lines
- **THEN** Claude splits it into parts named by role

#### Scenario: Repeated flex rules
- **WHEN** the same flex and gap rule would appear three times
- **THEN** Claude uses one layout helper

### Requirement: React mechanics are not restated
The skill SHALL link to the `jois-code-typescript-react` rule for types, hooks, tokens, styles and breakpoints, and SHALL NOT restate its rules.

#### Scenario: Overlap with the React rule
- **WHEN** a structure rule would repeat a rule in `jois-code-typescript-react`
- **THEN** the skill links to the rule and leaves the text out

### Requirement: Source is named and paraphrased
`SKILL.md` SHALL name *Refactoring UI* and its authors as the source of the visual rules. The rules SHALL be paraphrased, with no passage copied verbatim. The structure rules and their size limits SHALL be marked as the toolkit's own, not the book's.

#### Scenario: Attribution
- **WHEN** a reader opens `SKILL.md`
- **THEN** it names the book and its authors

#### Scenario: Structure rules are marked
- **WHEN** a reader opens the structure rules
- **THEN** they are marked as not from the book
