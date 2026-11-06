# Story Skills Internals

How the four story skills work inside. The skills are global toolkit items in `toolkit/skills/`: `jois-story-explore`, `jois-story-propose`, `jois-story-review` and `jois-story-plan`. Their commands are `/jois-story:propose`, `/jois-story:re-read` and `/jois-story:review`, in `toolkit/commands/jois-story/`. Each skill carries its scripts and a copy of what it shares with the planner, so an installed skill needs nothing from this repo. The specs are `toolkit-story-skills` and the capability spec for each writer. The files the skills write are described on [Data Folder](Data-Folder.md).

## Where the data folder comes from

The scripts use `planner/logic/skill-support/resolve-data-dir.mjs`, which is copied into each skill. It looks in this order:

1. The file that `PLANNER_CONFIG` names.
2. A `.plans/` folder in the current folder.
3. `planner.config.yaml` in the current folder.
4. Otherwise the skill reports that nothing was found and asks the user.

It never reads a parent folder, so a skill started in a sub-folder finds nothing, and its message names the folder it looked in. Only `codeBase` and `dataDir` are read, from a flat `key: value` file, so no `yaml` package is needed. A relative value is resolved against the config file's folder.

`jois-story-propose`, `jois-story-review` and `jois-story-plan` have `init-plans.mjs`, which creates `<current folder>/.plans` only after the user agrees. It sits over `planner/logic/skill-support/init-plans.mjs` and refuses a file named `.plans`. `jois-story-explore` only reports, because it never writes.

`.plans/` holds the same layout as any data folder. Committing it or git-ignoring it is the code base owner's choice, and the planner never edits `.gitignore`.

## The generated copy

`node planner/scripts/sync-skill-logic.mjs` copies the shared logic into each skill's `lib/` and the guidelines into its `references/`. Each copy starts with a `GENERATED. Do not edit this copy.` line. The map of what each skill gets is `SKILLS` in that script. The script reads every source as LF, whatever the checkout converted, then writes each copy with its source file's line ending (CRLF in a CRLF checkout, LF otherwise, never a mix), so git reports no change and a CRLF checkout stays clean after a run.

`planner/test/skill-sync.test.mjs` runs the script into a temp folder and fails when a committed copy differs. After changing `planner/logic/` or `planner/guidelines/`, run the script and commit the copies, so the skills never run on stale logic.

`planner/logic/diagrams/` was moved into `toolkit/skills/jois-story-plan/diagrams/` and is not copied. Only that skill imports the `mermaid` and `jsdom` packages (in `toolkit/skills/jois-story-plan/parse-mermaid.mjs`), so the portal build and `planner/logic/` never see them. <!-- docs-check: ignore -->

## How a skill reads and writes

A skill reads with its reader script (`read-story-context.mjs`, `read-backlog.mjs`, `read-diagrams.mjs` or `read-context-map.mjs`) or with ordinary file tools. Nothing confines reading.

A skill writes only through a writer script run with Bash. A writer validates everything first (`--check` validates without writing), refuses a path outside the data folder (the target comes from the backlog name and the kind), writes atomically and reads the file back. Nothing is logged.

### Naming stories

Stories are named by Title together with every ID, because IDs shift on `renumber`. `resolveStoryRef` in `planner/logic/backlog/story-ref.js` compares the pair, trimmed and case-folded. The scripts check a Title only when one is given, so each skill's text requires passing it. On a mismatch nothing is written.

### The propose and explore skills

`jois-story-explore` only discusses and never writes. Its `allowed-tools` lists `Bash(node *read-story-context.mjs*)`, `Read`, `Grep` and `Glob`, and `jois-story-propose` lists its scripts plus the same three read tools. The tools are read-only, so explore still cannot write. `read-story-context.mjs` stays the default for backlog data, because it checks titles and caps its output (search 25 lines, pattern 50, slice 200); the file tools are for `wiki/` and for what those caps cut off. A deny rule in a project's `.claude/settings.json` wins over a skill's grant, so in this repo, where `Read` of `planner/data/` is denied, the script remains the only path to backlog data. `jois-story-propose` shows full drafts, asks one yes/no and then runs the writers in order: `write-lexicon.mjs`, `write-proposal.mjs` and `write-review.mjs`, plus `suggest-lexicon.mjs` for a rename, delete or edit of a term. It reads each file back before it calls anything written.

`write-proposal.mjs` takes new stories (no `id`) and patches (the `id` of a proposed story, `NEW-<n>`, plus the fields to change). Validation is in `proposal-input.js`. It never removes a proposal and never writes `user-stories.csv`. A new story whose Epic, Feature and Title already exist in the proposals is skipped and reported. Clarifications, `resolve` and benching follow the specs `story-proposal-writer` and `story-writing-skills`.

Both skills apply the `story-contradiction-rule` capability (its text is in each skill's `SKILL.md` and its four steps are on [Story Skills](../Story-Skills.md#the-contradiction-rule)). The decision is stored as lines in the new story's `notes`, which the proposals writer already keeps: `Changes existing spec: <added|modified|removed> <path under wiki/> - <what changes>` and `Supersedes: <ID> <Title>`. No new column, writer or file exists, so the portal and the CSV model are unchanged. A frozen story is never edited or marked, and the superseding story goes through `jois-story-propose` into the proposals, where it is not frozen until a confirmed slice covers it. Until it is accepted it is in no slice's scope, so its `Changes existing spec` lines wait too.

Every story has a `Clarifications` column of `Q1: ...` and `A1: ...` pairs, where an empty answer is open. A proposed story can be benched (`Benched: Yes`), a column only proposals files have.

### The review skill

`jois-story-review` reviews a backlog against `planner/guidelines/product-backlog.md` and writes suggestions to `review.csv` through `write-review.mjs`. It never edits `user-stories.csv`, and its writer rejects any row for a frozen story (an old `unlock` row in a review file is shown as stale). It cites the guidelines through its `references/` copy and does not restate them. `read-backlog.mjs <backlog> [section]` serves the context in sections: `guidelines`, `sizing`, `lexicon`, `proposals`, `checks` and `epic-<n>`. The scope line counts frozen stories (`N of M stories submitted for review, K frozen (reference only)`), and frozen stories are reference only.

`planner/logic/review/review.js` is shared with the portal's Apply and Dismiss, so a suggestion applies the same way in both places. Each backlog has a lexicon, `<backlog>/lexicon.csv`, and its rules are in `planner/logic/lexicon/lexicon.js` and `planner/logic/lexicon/lexicon-suggestions.js`.

## The plan skill

`jois-story-plan` turns the shaped stories of one Epic, Feature or story into a slice in `<backlog>/slices/<slice>/`. The slice holds two files:

- `UC-<slice>.md` holds the specification, the class diagram, a `### Sequence: <flow>` heading per flow, and the design sections.
- `source.json` holds the stories by Title and a hash of their text, so a changed, missing or new story shows the slice as stale.

The design sections of `UC-<slice>.md` follow the fixed order of `SPEC_HEADINGS` in `toolkit/skills/jois-story-plan/diagrams/checks.js`. The section `## Changes to existing specs` sits after `## Open questions` and before `## Implementation overview`, so the code-bound sections stay last. It holds a table with the columns Change, Wiki page, What changes and Reason, or the word `None`. `checks.js` checks the shape only: four cells, `Change` one of `added`, `modified` or `removed`, and `Wiki page` a path under `wiki/` that ends in `.md` and does not start with `wiki/`. It never opens the wiki, because the diagram logic must not depend on the repo it runs in and an `added` row names a page that does not exist yet. A row has no status column, because applying a row is for a later stage. A slice drawn before this section existed fails the check until it is redrawn, and no slice is rewritten automatically.

The plan skill's tool grant is unchanged (`Read`, `Grep`, `Glob` and its scripts). It uses them to read wiki pages for contradictions and writes the rows from the `Changes existing spec` Notes lines of the stories in scope. A `Supersedes` line needs no row.

The rules are in `toolkit/skills/jois-story-plan/references/diagram-conventions.md`, which is a copy of `planner/guidelines/diagram-conventions.md`, the source. Its fenced `diagram-limits` block is read by `toolkit/skills/jois-story-plan/diagrams/limits.js`.

`write-freeze.mjs` is the plan skill's only write into `user-stories.csv`. It takes `[{ id, title }]` on stdin and runs after the slice is written and read back. It uses `freezeStories` from `planner/logic/backlog/ids.js` (copied into the skill's `lib/` by the sync script) and the backlog initials from `backlog.json`, and it refuses a story with no ID or with an ID that lacks the initials. Then it writes only the `Frozen` cell of the stories it names, atomically, and reads the file back. Freezing is idempotent, and nothing unfreezes a story, so a mistaken freeze is fixed by hand in the CSV.

`write-diagram.mjs` runs `checks.js` and Mermaid's own parser on every block, writes nothing when a check fails, and writes `source.json` last. If the skill-local packages are missing it says to run `npm ci` in the skill folder and refuses the write. `toolkit/install/Install-Toolkit.ps1` runs that `npm ci` after copying the skill, and `-NoPackages` skips it.

A context map (`context-map.json` and `context-map.md`) is read by `read-context-map.mjs` and written by `write-context-map.mjs`. Its rules are section 9 of the conventions.

The skill reads the target code base with ordinary `Read` and `Grep` in the current folder. There is no repo setting.
