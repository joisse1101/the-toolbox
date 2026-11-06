# Rules

This page says what the toolkit's rules are, when each one loads and why some load in every session. A rule is a short markdown file that Claude Code loads on its own, so nobody has to invoke it. The rules are the files in `toolkit/rules/`, and the catalogue of all fourteen is in the [Toolkit Guide](Toolkit-Guide.md).

## How a rule loads

A rule with no `paths:` list in its frontmatter loads at session start, in every project. A rule with a `paths:` list of file patterns, such as `"**/*.java"`, loads once a matching file is read or created. Frontmatter is the block of settings at the top of the file.

Tested on Claude Code 2.1.299: a scoped rule is not present before any matching file is touched. A change planned before any file is opened therefore has no scoped rules yet.

Every coding rule is scoped, so sessions that never touch code, such as tickets or workflows, load none of them. Scoped rules have no size limit, because they load only when needed and are written to be read, not squeezed.

## Unscoped rules

Five rules have no `paths:` list. Each one covers work that touches no code file, so a scoped rule would be missing exactly when it matters. The commit rule and the replies rule are the two that apply to nearly every session, and they are described first.

`jois-git-commit-hygiene` keeps commits to one concern and requires the user's confirmation word before Claude commits. A commit of images, deletions, renames or docs touches no code file, so a scoped rule would be missing exactly when those commits grow. It asks nothing unless Claude is about to commit. Apply flows, the commands and skills that apply the tasks of a plan, are the one case that commits without the word: each commits a finished concern on a branch other than `main` or `master` when its checks pass, and stops with nothing committed when a case is doubtful. A push needs the confirmation word in every flow, and an apply flow never pushes. Re-install the rule for this to take effect, because an older copy still says "never commit".

`jois-comms-replies` covers how Claude writes replies: plain words, the answer first, when to decide and when to ask, and how to ask. Replies happen in every session, whatever files are touched, so the rule loads in every session. It loads on every turn, so it is kept short (33 lines when this page was written) to keep its cost in each session small.

The other three are:

- `jois-test-mock-data` makes Claude test and verify with mock data and mock systems by default, and never use real systems or data unless the user asks in the current request. Verification such as a push or a deploy touches no code file.
- `jois-env-local-installs` lets Claude install packages only inside the project, such as through a project `.venv`, and asks the user when no project-local way exists. Installing a package touches no code file.
- `jois-env-stay-in-repo` keeps every file Claude creates for its own work under `.scratch/` in the project, and keeps every read and write inside the project. Those places apply before any code file is touched, so a scoped rule would load too late.

## The documents rule

`jois-comms-documents` is scoped to `**/*.md`. It loads when a markdown file is read or created, and not in sessions that never touch markdown. It asks for the purpose or result first and a header for each topic, nested by hierarchy.

Bullets are for parallel items that can be reordered without losing meaning, such as flags or file names. Reasoning is written as a paragraph, so that a "because" or a "so" stays attached to what it connects. A rule also asks that each remaining bullet hold one idea, that a technical term be defined on first use, and that each next step name an owner and a date. The toolkit's own markdown and the toolkit pages of this wiki follow it.

## The scoped coding rules

The scoped rules are split by what they cover:

- Three core rules, `jois-code-core-principles`, `jois-code-architecture-boundaries` and `jois-code-quality`, apply to source-code file types.
- One rule per technology: `jois-code-typescript-react`, `jois-code-java`, `jois-code-python`, `jois-code-config-files` and `jois-code-scripts`.

The technology rules add mechanics and do not restate the principles.

## Where a rule can be overridden

A project's own `CLAUDE.md` takes precedence over an installed rule. To keep the rules out of unrelated projects, install with `-Scope project` (see [Install](Install.md)).
