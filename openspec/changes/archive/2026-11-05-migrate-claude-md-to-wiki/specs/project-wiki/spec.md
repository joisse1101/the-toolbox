# Spec Delta

## Purpose

Defines what the repo's `wiki/` holds so a user can learn the planner and the toolkit from it, and so `CLAUDE.md` and the READMEs route to it and do not restate it.

## ADDED Requirements

### Requirement: Docs pass the checker
The pages under `wiki/`, the root `CLAUDE.md` and the nested `CLAUDE.md` files SHALL pass `python scripts/check_docs.py` with no problems.

#### Scenario: Checker passes
- **WHEN** `python scripts/check_docs.py` runs from the repo root after the migration
- **THEN** it SHALL exit 0 and report no problems

### Requirement: Paths are written from the repo root
A repo path in inline code on a wiki page or in a `CLAUDE.md` SHALL be written from the repo root, never relative to a sub-folder.

#### Scenario: A moved file path
- **WHEN** an architecture page names the CSV parser
- **THEN** it SHALL write `planner/logic/backlog/csv.js` and not `backlog/csv.js`

### Requirement: Architecture knowledge lives in the wiki
The wiki SHALL hold the architecture detail that `CLAUDE.md` held: the logic modules, the portal server and web app, the data folder layout and config, and the story-skill internals. Every reason stated in the old text SHALL still be stated.

#### Scenario: Nothing lost in the move
- **WHEN** a statement with a reason (for example why story IDs are derived and not stable) was in `CLAUDE.md` before the change
- **THEN** a wiki page SHALL state it with the same reason

### Requirement: CLAUDE.md routes to the wiki
The root `CLAUDE.md` SHALL keep the commands, the rule for which folder may import which, and the change workflow. It SHALL carry a routing table with one row per top-level wiki folder.

#### Scenario: A new topic folder
- **WHEN** a topic folder exists directly under `wiki/`
- **THEN** the routing table SHALL have a row naming it and its first page

### Requirement: Toolkit user guide
The wiki SHALL list every toolkit skill, command, rule and agent, say what each does and when to use it, and give task recipes that name the items to run in order.

#### Scenario: Every item is listed
- **WHEN** the guide is compared with `toolkit/skills/`, `toolkit/commands/`, `toolkit/rules/` and `toolkit/agents/`
- **THEN** each item in those folders SHALL appear in the guide

#### Scenario: A recipe gives an order
- **WHEN** a reader looks up how to carry out an OpenSpec change
- **THEN** the recipe SHALL name the commands in the order to run them

### Requirement: Planner user guide
The wiki SHALL describe how to use the planner and its story skills as user flows, each naming the portal tab or skill involved and the file it reads or writes.

#### Scenario: Flows cover the full path
- **WHEN** a reader follows the flows in order
- **THEN** they SHALL cover creating a backlog, shaping and saving stories, accepting proposals, reviewing, planning a slice and changing the data folder

### Requirement: READMEs are a quick start
The root `README.md` and `toolkit/README.md` SHALL hold a quick start and link to the wiki page for each topic they no longer explain. A README section SHALL be removed only after its content is on a wiki page.

#### Scenario: A trimmed section
- **WHEN** a README no longer explains a topic
- **THEN** it SHALL link to the wiki page that does

#### Scenario: No broken link to a moved section
- **WHEN** a file linked to a README section that moved
- **THEN** the link SHALL point at the wiki page instead

### Requirement: Wiki lists the communication rules
The toolkit wiki SHALL list both communication rules. It SHALL say that five rules are unscoped, name the commit rule and the replies rule as the two that apply to nearly every session, and say why the replies rule is short. Its summary of the documents rule SHALL state that bullets are for parallel items and that reasoning is written as a paragraph.

#### Scenario: Wiki names the rules
- **WHEN** a reader opens the wiki's rules section
- **THEN** it SHALL name `jois-comms-replies` and `jois-comms-documents` and say when each loads

#### Scenario: Wiki summary matches the rule
- **WHEN** a reader reads the wiki's summary of `jois-comms-documents`
- **THEN** it SHALL say that bullets are for parallel items and that reasoning is written as a paragraph
