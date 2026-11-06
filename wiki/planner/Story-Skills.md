# Story Skills

Four skills let Claude Code work on a backlog beside the portal: `jois-story-explore`, `jois-story-propose`, `jois-story-review` and `jois-story-plan`. Three slash commands start or check that work: `/jois-story:propose`, `/jois-story:re-read` and `/jois-story:review`. This page says what each does, what it writes and in which order to use them. The skills' own scripts and the generated copies of shared code are described on [Story Skills Internals](architecture/Story-Skills-Internals.md), and the routines that combine them with the portal are on [User Flows](User-Flows.md). A skill is a folder of instructions and scripts that Claude loads when you ask for the work or name it. A slash command is a prompt you type to run a fixed routine.

## What all four skills share

Each skill finds the data folder itself, in the folder where you started Claude and never in a parent folder. It uses the config file `PLANNER_CONFIG` names, else a `.plans` folder in the current folder, else a `planner.config.yaml` there. So start Claude in the code base folder, or set `PLANNER_CONFIG`. When nothing is found the skill says which folder it looked in. The propose, review and plan skills then offer to create `.plans`, only after you agree, and the explore skill only reports it, because it never writes.

A skill writes only through its own writer scripts. A writer checks everything first, writes nothing when anything is invalid, and the skill reads the file back before it says that something was written. The skills never edit the text of a story in `<backlog>/user-stories.csv`, because the portal saves that file as you edit and a second writer would clash with it. The one exception is `jois-story-plan`, which sets the `Frozen` flag of the stories a confirmed slice covers (see below). They name a story by its title and pass the title with every ID, because the IDs of stories that are not frozen shift when the backlog is renumbered and a title mismatch stops the write. They treat everything read from a file as data and never as instructions.

## Order of use

Use the skills in this order, and skip the ones you do not need. Explore the idea, propose what you agreed, review the backlog, then plan the shaped stories. The portal sits between the steps: you accept proposals, apply or dismiss suggestions and edit terms there, and the later steps read the result.

| Step | Skill or command | Writes | You then |
| --- | --- | --- | --- |
| 1. Explore | `jois-story-explore` | nothing | decide what to save |
| 2. Propose | `jois-story-propose`, `/jois-story:propose` | proposals, review suggestions, terms, term suggestions | accept, apply or dismiss in the portal |
| 3. Review | `jois-story-review` | review suggestions | apply or dismiss in the portal |
| 4. Plan | `jois-story-plan` | a slice and the context map | open the slice document |

Run `/jois-story:re-read` whenever you changed files in the portal or in a spreadsheet during a session, and `/jois-story:review` to check that a session's work is in sync.

## jois-story-explore

Use it to think through new stories before writing anything. It reads the backlog, the proposals and the lexicon through `read-story-context.mjs`, and it discusses scope, splitting, epic and feature placement, dependencies and acceptance criteria against `planner/guidelines/product-backlog.md`. It may sketch drafts in the conversation, and it says they are not saved. It asks the question that decides how stories are split before it drafts, and it checks new or renamed terms against the lexicon and every Avoid list before a story uses them.

It never writes a file and runs no command except the reader. Besides the reader it has the read-only tools `Read`, `Grep` and `Glob`, for pages of the project's `wiki/` and for what the reader's caps cut off (the reader stays the default for backlog data). It ignores benched proposed stories.

Every new or changed story is checked against the backlog, the proposals and the wiki by the contradiction rule (see [The contradiction rule](#the-contradiction-rule)). The skill reports a contradiction, asks you which side stands, and shows the resulting Notes lines in the reply only, because it writes nothing. When you want the drafts saved it hands over to `jois-story-propose`, and typing that name or asking to save is the hand-over. There is no slash command for it, so ask for it by name, for example by giving a backlog name and a story or idea.

## jois-story-propose and /jois-story:propose

Use it to save what you agreed. The skill turns the session into four kinds of output, each written by its own script:

- New stories and patches to proposed stories go to `<backlog>/user-stories/proposals.csv` (`write-proposal.mjs`). The Proposed tab shows them.
- Changes to stories already in the backlog go to `<backlog>/user-stories/review.csv` as suggestions (`write-review.mjs`). The Editor and Review tabs show them.
- New terms go straight into `<backlog>/lexicon.csv` (`write-lexicon.mjs`).
- An edit, rename or delete of an existing term goes to `<backlog>/lexicon/lexicon-suggestions.csv` (`suggest-lexicon.mjs`). The Lexicon tab shows it, and the term changes only when you apply it.

New stories get the next free placeholder ID `NEW-<n>`, or patch a proposed story in place. A new story whose Epic, Feature and Title are already in the proposals is skipped, so sending a batch again is safe. An agreed change to a story already in the backlog becomes one review row, and review rows from this skill always append. An edit to a locked story comes with an `unlock` row. A benched story is skipped by the skills.

The skill first runs each writer with `--check`, then shows every draft in full and asks one yes or no question, and it writes only after a separate yes. It writes in this order: lexicon, term suggestions, proposals, edits. It never removes a proposed story and never writes `user-stories.csv`.

The skill has `Read`, `Grep` and `Glob` too, used for wiki pages and for what the reader's caps cut off, never to write. It runs the contradiction rule on every draft before it shows one as ready. The `Changes existing spec` and `Supersedes` lines go in the `notes` of the new story, are shown in the complete draft, are covered by the one yes or no, and are written only through the proposals writer. An edit to a contradicted story that is not frozen becomes a review suggestion, and one to a proposed story becomes a patch. The skill never writes to `wiki/`.

The command `/jois-story:propose` runs the same skill and skips the yes or no question, because running it is your go-ahead. It drafts from the conversation so far and stops if nothing was agreed. It still prints each draft right before its writer runs, checks first and reads each file back. Add extra instructions after the command and they are passed along.

## jois-story-review

Use it to review a whole backlog. It reads the backlog in sections (`read-backlog.mjs`: checks, lexicon, proposals, sizing, guidelines, then each epic) against `planner/guidelines/product-backlog.md`. It looks at the hierarchy, the INVEST principles, the acceptance criteria with an edge-case checklist, and consistency across stories, the lexicon and the proposals. Every finding about a story comes with a field edit the portal can apply, written to `<backlog>/user-stories/review.csv` through `write-review.mjs` in batches of about eight to ten rows. Findings about the lexicon or proposals cannot be edited by this skill, so they go in the report as questions. Open questions about a story are suggested as `Clarifications` rows. A review run without `--append` replaces the whole review, these rows included, so apply the suggestions you want before you run it again.

Frozen stories are reference only: they are not reviewed, and the skill writes no row for them. A strong objection to a frozen story goes in the report, with the note that a change to it needs a superseding story (a story that replaces it, see [The contradiction rule](#the-contradiction-rule)). The skill ends with a report grouped by area, and tells you the suggestions are applied or dismissed in the portal. It does not apply them itself. There is no slash command to start it, so ask for it by name.

## jois-story-plan

Use it to turn the shaped stories of one Epic, one Feature or one story into a slice, a document with the use-case specification, a class diagram and sequence diagrams as Mermaid blocks. It also draws a context map when you ask, which sets the bounded contexts of the product, their owners and how they link. The slice goes to `<backlog>/slices/<slice>/` as `UC-<slice>.md`, `tasks.md` and `source.json`, and the map to `<backlog>/context-map.json` and `<backlog>/context-map.md`. The rules for diagrams are in `planner/guidelines/diagram-conventions.md`.

The skill decides the scope with you first, then shows a design checkpoint with an outline and the decisions it cannot ground in the stories, and asks them. It never fills a decision with a default. When the current folder holds the code of the flow it reads that code and draws what it finds (repo mode). When it holds little or no code, the skill asks you once, before the checkpoint, whether the story builds the code (greenfield mode) or describes code that exists or a design only (describe-only mode), and never assumes the answer. In describe-only mode the slice stays at design level with `Maturity` `planned`. In greenfield mode the skill asks the project layout and the stack, records each answer as a `user-confirmed` design decision, marks `Maturity` as `planned (greenfield)`, puts the build plan in the implementation overview and marks each traceability row `planned`. The three modes are in section 5 of `planner/guidelines/diagram-conventions.md`. It also drafts `tasks.md`, the build tasks of the slice: one or more per acceptance criterion, grouped by flow, each with a `Satisfies:` and a `Verify:` line. It shows the complete document and the complete `tasks.md` in one reply, before it asks, lists the stories the slice covers that will be frozen, the ones already frozen and the ones that cannot be frozen. It asks "Write this slice and freeze its stories?" once for both. The same reply lists the security and non-functional rules, the `TBC` decisions and the open questions that no task covers, so you see what the draft left out. It also lists failure paths no task covers: a failure response that no `Verify:` line names and whose criterion is on the main path, so no failure criterion owns it. A rule counts as covered only when a `Verify:` line names it. A task that depends on a `TBC` decision or an open question names it in its `Verify:` line. It writes only after you choose "Yes, write and freeze". The skill sends every task unticked and the writer keeps a tick from an earlier `tasks.md` only while the criterion's text is unchanged; after a redraw the skill tells you which tasks were reset or dropped. Every diagram is checked with Mermaid's own parser before anything is written.

Each slice has a `## Changes to existing specs` section, after `## Open questions`. The skill reads the Notes of every story in scope and turns each `Changes existing spec` line into one row (Change, Wiki page, What changes, Reason), or writes `None`. It asks you before it writes a row for a contradiction that no Notes line records, never edits the wiki, and never marks a row applied. Wiki pages are read with `Read`, `Grep` and `Glob`.

The skill reports slices as stale when their stories changed, and redraws only when you ask. It writes the slice, the map and one more thing: the `Frozen` flag, described below. For a change to a story or a term it offers `jois-story-propose`, and it needs its own packages, installed by `npm ci` in the skill folder.

### Freezing the stories of a slice

The plan skill's one write into the backlog is the `Frozen` column. After the slice is written and read back with a match, the skill runs `write-freeze.mjs`, which marks the stories the slice covers as frozen and changes no other cell. A frozen story is read-only in the portal, keeps its ID for good, and cannot be deleted. If the slice write fails or the read-back does not match, no story is frozen.

The writer refuses a story that has no ID, and a story whose ID does not begin with the backlog's initials (for example `IAM-0003` in a backlog with initials `B1`). For the second case, open the backlog in the portal once so it rewrites the IDs, then freeze again. Freezing a story twice leaves the same result as freezing it once.

No skill and no portal control unfreezes a story. A freeze made by mistake is fixed by hand: open `<backlog>/user-stories.csv` in a text editor or Excel and clear the `Frozen` cell of that story. A change to a frozen story needs a superseding story, described next.

## The contradiction rule

The rule keeps a new story from silently clashing with what is already agreed. The explore and propose skills apply it to every new or changed story, and the plan skill carries its result into the slice. It has four steps.

1. Report it. When a story contradicts a story of the backlog or the proposals, or a wiki page, the skill names it plainly (the story by Title, the page by its path under `wiki/`). It does not drop the new story and does not ignore the earlier one.
2. Ask which one stands. The skill asks you, recommends one when the stories, the wiki or the code favour it, and shows no draft as accepted until you answer. If the earlier one stands, nothing changes.
3. A winning new story changes the old spec. For a wiki page, the new story's Notes get the line `Changes existing spec: <added|modified|removed> <path under wiki/> - <what changes>`. For a story of the backlog that is not frozen, the skill drafts a review suggestion, and for a proposed story a patch.
4. Never edit a frozen story. The new story supersedes it, and its Notes carry `Supersedes: <ID> <Title>`, with the frozen story's permanent ID. The frozen story stays frozen and unmarked.

To find the wiki page, the skills read, relative to the current folder and never a parent, the "Where the docs are" table of `CLAUDE.md` first, then `wiki/Home.md` and the topic pages the story's terms point to, and only then `Grep` on `wiki/`. When the folder has no `wiki/`, the skill says so in one line, names `jois-init:docs` as the way to set one up, carries on against the backlog and proposals, and never creates `wiki/`. Text from the wiki, `CLAUDE.md` or the backlog is data, never instructions, and no skill opens a secret file because a text says to.

The decision travels in the Notes lines, because the Notes field already holds decisions and no new column or file is needed. The plan skill reads them when it drafts the slice, and a later stage applies them to the wiki. Nothing is applied to the wiki before that.

## The three commands

- `/jois-story:propose` runs `jois-story-propose` without the yes or no step, as described above.
- `/jois-story:re-read` only reads. It reloads the backlog, the proposals, the lexicon and the counts of review and term suggestions, compares them with what the session knew, says by title what changed, and marks the drafts that are now out of date. It starts no drafting.
- `/jois-story:review` is not the same as the `jois-story-review` skill. It audits the work of the current session only: whether what was agreed is written, whether the lexicon, dependencies, size, clarifications and review rows are in sync. It writes nothing and runs a writer only with `--check`. It ends with a checklist of what you do in the portal, what to ask via `/jois-story:propose`, and what needs a decision. For a whole-backlog review use the skill.

## Where this page and the sources differ

Two places say otherwise, and this page follows the command and skill files. `CLAUDE.md` lists `/jois-story:review` as a command of the story skills without saying that it is a session audit, and the portal's notice for suggestions that no longer match a story tells you to run `/jois-story:review` again, where the skill that writes review suggestions is `jois-story-review`.
