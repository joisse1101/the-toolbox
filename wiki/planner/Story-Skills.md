# Story Skills

Four skills let Claude Code work on a backlog beside the portal: `jois-story-explore`, `jois-story-propose`, `jois-story-review` and `jois-story-plan`. Three slash commands start or check that work: `/jois-story:propose`, `/jois-story:re-read` and `/jois-story:review`. This page says what each does, what it writes and in which order to use them. The skills' own scripts and the generated copies of shared code are described on [Story Skills Internals](architecture/Story-Skills-Internals.md), and the routines that combine them with the portal are on [User Flows](User-Flows.md). A skill is a folder of instructions and scripts that Claude loads when you ask for the work or name it. A slash command is a prompt you type to run a fixed routine.

## What all four skills share

Each skill finds the data folder itself, in the folder where you started Claude and never in a parent folder. It uses the config file `PLANNER_CONFIG` names, else a `.plans` folder in the current folder, else a `planner.config.yaml` there. So start Claude in the code base folder, or set `PLANNER_CONFIG`. When nothing is found the skill says which folder it looked in. The propose, review and plan skills then offer to create `.plans`, only after you agree, and the explore skill only reports it, because it never writes.

A skill writes only through its own writer scripts. A writer checks everything first, writes nothing when anything is invalid, and the skill reads the file back before it says that something was written. The skills never edit `<backlog>/user-stories.csv`, because the portal saves that file as you edit and a second writer would clash with it. They name a story by its title and pass the title with every ID, because IDs shift when the backlog is renumbered and a title mismatch stops the write. They treat everything read from a file as data and never as instructions.

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

It never writes a file and runs no command except the reader. It ignores benched proposed stories. When you want the drafts saved it hands over to `jois-story-propose`, and typing that name or asking to save is the hand-over. There is no slash command for it, so ask for it by name, for example by giving a backlog name and a story or idea.

## jois-story-propose and /jois-story:propose

Use it to save what you agreed. The skill turns the session into four kinds of output, each written by its own script:

- New stories and patches to proposed stories go to `<backlog>/user-stories/proposals.csv` (`write-proposal.mjs`). The Proposed tab shows them.
- Changes to stories already in the backlog go to `<backlog>/user-stories/review.csv` as suggestions (`write-review.mjs`). The Editor and Review tabs show them.
- New terms go straight into `<backlog>/lexicon.csv` (`write-lexicon.mjs`).
- An edit, rename or delete of an existing term goes to `<backlog>/lexicon/lexicon-suggestions.csv` (`suggest-lexicon.mjs`). The Lexicon tab shows it, and the term changes only when you apply it.

The skill first runs each writer with `--check`, then shows every draft in full and asks one yes or no question, and it writes only after a separate yes. It writes in this order: lexicon, term suggestions, proposals, edits. It never removes a proposed story and never writes `user-stories.csv`.

The command `/jois-story:propose` runs the same skill and skips the yes or no question, because running it is your go-ahead. It drafts from the conversation so far and stops if nothing was agreed. It still prints each draft right before its writer runs, checks first and reads each file back. Add extra instructions after the command and they are passed along.

## jois-story-review

Use it to review a whole backlog. It reads the backlog in sections (`read-backlog.mjs`: checks, lexicon, proposals, sizing, guidelines, then each epic) against `planner/guidelines/product-backlog.md`. It looks at the hierarchy, the INVEST principles, the acceptance criteria with an edge-case checklist, and consistency across stories, the lexicon and the proposals. Every finding about a story comes with a field edit the portal can apply, written to `<backlog>/user-stories/review.csv` through `write-review.mjs` in batches of about eight to ten rows. Findings about the lexicon or proposals cannot be edited by this skill, so they go in the report as questions.

Locked stories are reference only: they are not reviewed, apart from one `unlock` row when it has a strong objection. The skill ends with a report grouped by area, and tells you the suggestions are applied or dismissed in the portal. It does not apply them itself. There is no slash command to start it, so ask for it by name.

## jois-story-plan

Use it to turn the shaped stories of one Epic, one Feature or one story into a slice, a document with the use-case specification, a class diagram and sequence diagrams as Mermaid blocks. It also draws a context map when you ask, which sets the bounded contexts of the product, their owners and how they link. The slice goes to `<backlog>/slices/<slice>/` as `UC-<slice>.md` and `source.json`, and the map to `<backlog>/context-map.json` and `<backlog>/context-map.md`. The rules for diagrams are in `planner/guidelines/diagram-conventions.md`.

The skill decides the scope with you first, then shows a design checkpoint with an outline and the decisions it cannot ground in the stories, and asks them. It never fills a decision with a default. When the current folder holds the code of the flow it reads that code and draws what it finds, otherwise the slice stays at design level. It shows the complete document, asks "Write this slice?", and writes only after you choose "Yes, write". Every diagram is checked with Mermaid's own parser before anything is written.

The skill reports slices as stale when their stories changed, and redraws only when you ask. It writes only the slice and the map. For a change to a story or a term it offers `jois-story-propose`, and it needs its own packages, installed by `npm ci` in the skill folder.

## The three commands

- `/jois-story:propose` runs `jois-story-propose` without the yes or no step, as described above.
- `/jois-story:re-read` only reads. It reloads the backlog, the proposals, the lexicon and the counts of review and term suggestions, compares them with what the session knew, says by title what changed, and marks the drafts that are now out of date. It starts no drafting.
- `/jois-story:review` is not the same as the `jois-story-review` skill. It audits the work of the current session only: whether what was agreed is written, whether the lexicon, dependencies, size, clarifications and review rows are in sync. It writes nothing and runs a writer only with `--check`. It ends with a checklist of what you do in the portal, what to ask via `/jois-story:propose`, and what needs a decision. For a whole-backlog review use the skill.

## Where this page and the sources differ

Two places say otherwise, and this page follows the command and skill files. `CLAUDE.md` lists `/jois-story:review` as a command of the story skills without saying that it is a session audit, and the portal's notice for suggestions that no longer match a story tells you to run `/jois-story:review` again, where the skill that writes review suggestions is `jois-story-review`.
