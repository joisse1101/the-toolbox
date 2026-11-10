# Toolkit Guide

This page lists every item in the toolkit, says what each one does and says when to use it. The toolkit is the folder `toolkit/`: reusable files for Claude Code that you copy onto a machine or into a project. To put them there, see [Install](Install.md). To see which items to run for a job, see [Task Recipes](Task-Recipes.md). The rules, which load without being called, have their own page: [Rules](Rules.md).

## Four kinds of item

A **skill** is a folder with a `SKILL.md` file. Claude Code loads it when its description matches the request, or when you name it. A skill may carry scripts and reference files.

A **command** is a markdown file you start by typing a slash, such as `/jois-git:stage`. A folder under `toolkit/commands/` is a namespace, so `toolkit/commands/jois-git/stage.md` is `/jois-git:stage`. Every command is manual only: it declares `disable-model-invocation: true`, so Claude never starts one on its own and its description does not fill each session's skill list. The one exception is `/jois-code:validate`, which `/jois-code:review` must start through the Skill tool; see [Command Details](Command-Details.md).

A **rule** is a short instruction file that Claude Code loads by itself. Some load at session start and some only when a matching file is touched.

An **agent** is a helper with its own context and its own tool list. A command dispatches it, and you do not start one by hand.

Every item is named `jois-<domain>-<thing>`. `jois` is the owner, so a name never collides with a built-in or third-party item. The domain says what the item is for:

| Domain | Meaning |
| --- | --- |
| `code` | writing source code |
| `git` | commits and pull requests |
| `docs` | documents written from notes |
| `design` | how a user interface looks and how its frontend code is structured |
| `story` | user-story backlogs: exploring, proposing, reviewing, planning and verifying stories |
| `comms` | how Claude writes replies and documents |
| `env` | where Claude may install and write |
| `test` | how Claude verifies a change |
| `init` | setting a project up |

Skills and rules are named `jois-<domain>-<thing>`, and a command namespace folder is `jois-<domain>`, so `toolkit/commands/jois-git/stage.md` is `/jois-git:stage`. A new domain picks its own word. The `/opsx:*` commands are the one exception. The `openspec` command-line tool generates them and overwrites them on every `init` and `update`, so the toolkit keeps no copy. Use `/jois-init:opsx` to set a project up for them.

## Skills

The toolkit holds seven skills, in `toolkit/skills/`.

| Skill | What it does | Use it when |
| --- | --- | --- |
| `jois-design-ui-principles` | Gives visual-design rules and frontend structure rules, with a checklist and reference files read on demand. It uses the project's design tokens first and fills gaps from starter values. | You design, build, style or review a page, component, form or layout, or ask to "make it look better". Not for behaviour-only changes, command-line tools or backend code. |
| `jois-init-docs-templates` | Holds the files that `/jois-init:docs` copies into a project: the checker, the builder, the workflows and their tests. | Never directly. It is not a skill to invoke, and `/jois-init:docs` reads it. |
| `jois-story-explore` | Talks new stories through with you against the backlog guidelines and the existing stories. It never writes a file. | You want to explore, shape or brainstorm stories before saving them. |
| `jois-story-propose` | Shows full drafts, asks one yes or no, then writes proposed stories, edits to backlog stories, new lexicon terms and term changes through its writer scripts. It never edits the backlog file. | The stories are agreed and you want them saved for the planner to show. |
| `jois-story-review` | Reviews a whole backlog against the backlog guidelines, reports findings with fixes and writes them as suggestions the planner can apply. It never edits the backlog file. | You want a backlog audited, sanity-checked or INVEST-checked. |
| `jois-story-plan` | Draws the context map of a backlog and turns the stories of one Epic, Feature or story into a slice: a use-case specification with class and sequence diagrams. It writes only after you confirm, and the same yes also freezes the stories the slice covers (the `Frozen` column is its one write into the backlog). | You want stories planned, drawn or specified, or a stale slice redrawn. |
| `jois-story-verify` | Checks one stored slice before it is built: stale, document and diagram checks, a criterion with no task, a `TBC` decision, an open clarification question and a task that waits on an open item. It ranks each finding critical, warning or suggestion with a fix. It writes only after you approve: slice fixes through the plan skill's writer, story problems only as suggestions. It has no scripts of its own and needs `jois-story-plan` installed. | You want a slice verified or sanity-checked before you build from it. |

The five story skills are explained for their users in [Story Skills](../planner/Story-Skills.md), and their internals in [Story Skills Internals](../planner/architecture/Story-Skills-Internals.md).

## Commands

The toolkit holds twelve commands, in `toolkit/commands/`, in five namespaces.

| Command | What it does | Use it when |
| --- | --- | --- |
| `/jois-code:apply <change>` | Applies an OpenSpec change one group of tasks at a time. It hands each group to the `opsx-task-applier` agent, records the result in `tasks.md`, checks the group with `opsx-test-runner` and commits it by itself on a branch other than `main` or `master`. Otherwise it commits nothing, says which condition failed and stops. It never pushes. | You have an OpenSpec change with tasks to carry out. |
| `/jois-code:apply slice <backlog>/<slice>` | The slice form of the same command. It builds a slice written by `jois-story-plan` instead of an OpenSpec change. It first checks that the slice is current with the plan skill's `read-diagrams.mjs` and stops on a stale slice. It then works the slice's `tasks.md` group by group and ticks each task in place. It never stages the slice folder and never pushes. | You have a slice whose build tasks are written. |
| `/jois-code:validate slice <backlog>/<slice>` | Tests whether the code does what a slice says. It turns the slice's `Satisfies:` rows and its stories' acceptance criteria into claims, tests each in a throwaway checkout under `.scratch/` with the `code-validator` agent, and reports each as `met`, `not met` or `could not test`, with evidence. It writes `validation.md` into the slice folder after a full run and `validation.partial.md` after a run for one story. It never edits the code, commits or pushes. | A slice is built and you want to know whether its requirements are met. |
| `/jois-code:validate <PR number>` | The PR form of the same command. It builds the claims from the PR description and the issue it links, so it works for someone else's PR with no slice. It asks for your yes before it runs a PR whose author is not you, and it only prints its report. | You review a PR and want its claims tested. |
| `/jois-code:review [<PR number>] [slice <backlog>/<slice>] [low\|medium\|high\|xhigh] [--comment]` | Reviews a PR, or the current branch against `main` when you give no number, in one step. It runs the built-in `code-review` skill (the static check against `CLAUDE.md`, the rules and the wiki), then `/jois-code:validate` (the behavioural check), and prints one report with the two parts apart. A branch with no `slice` makes it ask for a slice or a PR number. With `--comment` it asks one yes/no question before the static check, because the skill posts while it runs. It refuses `--fix` and never edits, commits or pushes. | You want a PR or branch checked against the rules and against its claims. |
| `/jois-code:archive slice <backlog>/<slice>` | Folds a built and validated slice into the existing topic pages of the project's `wiki/`. It refuses a stale or unfinished slice, or one whose `validation.md` is not `Validated: yes` at the current commit. It maps each part of the slice to a page and waits for your approval, applies the slice's `Changes to existing specs` rows as diffs you approve, and writes `ARCHIVED.md` into the slice folder. It stops at the commit rule's confirmation word and never pushes. | A slice is built and validated and its wiki pages must now describe it. |
| `/jois-docs:meeting-minutes` | Turns pasted notes, or a notes file, into minutes in a fixed template. It asks for every gap, shows the minutes and saves only after you confirm. | You have meeting notes to turn into minutes. |
| `/jois-git:stage` | Clears a messy working tree one concern at a time. It stages, proposes a message, waits for a confirmation word, commits and repeats until the tree is clean. It needs no OpenSpec change. | You have many uncommitted changes to split into clean commits. |
| `/jois-git:write-pr` | Opens GitHub pull requests for the commits on the current branch, grouped by concern, from the team template. It never merges and lists the merge commands for you to run. | Your commits are ready for review. |
| `/jois-git:update-pr` | Brings the open pull request of the current branch up to date: restacks after its base PR merged, pushes new commits and refreshes the body. It never merges. | A PR already exists and the branch changed or its base merged. |
| `/jois-git:write-issue` | Drafts a bug, feature or task issue from the team templates and creates it on GitHub (`gh`) or GitLab (`glab`). It creates issues and nothing else. | You want to file an issue. |
| `/jois-init:opsx` | Sets OpenSpec up in a project: runs `openspec init` when `openspec/` is missing, checks the global workflows and adds the commit guidance to `openspec/config.yaml`. | A project starts using OpenSpec. |
| `/jois-init:docs` | Sets the docs process up in a project: nested pages in `wiki/`, a checker, a builder, a one-way wiki publish and a pull request checklist line. | A project needs a docs wiki that is checked for drift. |
| `/jois-story:propose` | Writes the stories, backlog edits and lexicon terms agreed in this session straight to the planner's files, without the yes or no step of the skill. The command is your go-ahead. | You finished exploring with `jois-story-explore` and want it saved now. |
| `/jois-story:re-read` | Re-reads the backlog, proposals, lexicon and the stories under discussion after you changed them outside the session, says what changed and carries on. It writes nothing. | You edited the files in the portal or a spreadsheet during a session. |
| `/jois-story:review` | Audits what this session shaped and wrote, for sync, and lists what is left to do. It writes nothing. | You want to check the session's work before you stop. |
| `/jois-story:verify` | Runs `jois-story-verify` on the slice you name, checks it against the slice's own rules and against the wiki and code of the current folder, and ends with the ranked report. It never edits the wiki or the code. It writes a correction or a suggestion only after you answer yes to the exact change. | You want a written slice checked before you build from it. |

## Rules

The toolkit holds fourteen rules, in `toolkit/rules/`. The [Rules](Rules.md) page says when each one loads and why. Nine are scoped to file types and five are not.

| Rule | What it asks | Loads |
| --- | --- | --- |
| `jois-code-architecture-boundaries` | Keeps frontend, backend and shared code apart: no import across the boundary, one shared contract definition, authorization on the server. | When source code is touched |
| `jois-code-config-files` | Mechanics for configuration files. | When a YAML, JSON or TOML file is touched |
| `jois-code-core-principles` | Language-agnostic principles: simplicity, one job per unit, fail fast, no real user state in tests. | When source code is touched |
| `jois-code-java` | Java mechanics. | When a Java file is touched |
| `jois-code-python` | Python mechanics. | When a Python file is touched |
| `jois-code-quality` | Concrete code smells to avoid and a testing structure to follow. | When source code is touched |
| `jois-code-scripts` | Mechanics for PowerShell, Bash and batch scripts. | When a script is touched |
| `jois-code-typescript-react` | TypeScript and React mechanics. | When a TypeScript, JavaScript, CSS or HTML file is touched |
| `jois-comms-documents` | How to write markdown: purpose first, a header per topic, bullets only for parallel items. | When a markdown file is touched |
| `jois-comms-replies` | How to write replies: plain words, the answer first, when to decide and when to ask. | Every session |
| `jois-env-local-installs` | Installs only inside the project folder. | Every session |
| `jois-env-stay-in-repo` | Every file Claude creates for its own work goes under `.scratch/` in the project, and nothing is read or written outside it. | Every session |
| `jois-git-commit-hygiene` | One concern per commit. A commit needs the user's confirmation word, except in an apply flow, which commits a checked concern by itself on a branch other than `main` or `master`. A push always needs the word. | Every session |
| `jois-test-mock-data` | Test and verify with mock data and mock systems by default. | Every session |

## Agents

The toolkit holds two agents, in `toolkit/agents/`. A command dispatches them, so you do not run them yourself.

| Agent | What it does | Dispatched by |
| --- | --- | --- |
| `opsx-task-applier` | Applies one group of an OpenSpec change's or a slice's tasks in order, stops at the first blocked or failed task and reports per task what it changed and what it saw. It has a 50-turn limit. Hooks block `git commit`, `git push`, `gh`, a recursive and forced `rm`, and an edit of a change's or a slice's `tasks.md`. | `/jois-code:apply` |
| `opsx-test-runner` | Runs only the test commands the project's own instructions name, for the files a group changed, and reports each command with its exit code and counts. It uses the Haiku model, has no edit tools and installs nothing. | `/jois-code:apply`, after each group |
| `code-validator` | Tests one group of claims in a throwaway checkout and reports one verdict per claim with its evidence. It has a 40-turn limit and no edit tools. Hooks block `git commit`, `git push`, `gh` and a recursive and forced `rm`. | `/jois-code:validate` |

A hook is a check that runs before a tool call and can refuse it. The task agent and the test runner each carry one so they cannot commit, push or call GitHub.

`/jois-code:apply` needs `opsx-task-applier` installed and stops without it. It also looks for `opsx-test-runner`, and when that is missing it stops with nothing committed and names the missing agent. The slice form `/jois-code:apply slice <backlog>/<slice>` also needs the `jois-story-plan` skill installed, and stops with a note naming `Install-Toolkit.ps1` without it.

## Where the numbers come from

The counts on this page were read from a listing of each folder, not from the READMEs. The seven skills, twelve commands, fourteen rules and two agents are every entry in `toolkit/skills/`, `toolkit/commands/`, `toolkit/rules/` and `toolkit/agents/`.
