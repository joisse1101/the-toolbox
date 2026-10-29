## Context

`write-pr.md` and `update-pr.md` each carry a "PR body template" and an "Author Verification" section.
`toolkit/check_toolkit.py` fails if either section differs between them, so a template change is made in
both files. Step 5 of each command gathers verification for every group. The commands are global: they
are installed into other repositories, so nothing in them may name this repository's paths. See
proposal.md - Why for the problem.

## Goals / Non-Goals

**Goals:**
- One predicate, "the group needs no tests", drives the three skips: the testing block, the step 5
  question and Author Verification.
- Reviewer steps that exercise what the group changes.

**Non-Goals:**
- Merging `write-pr` and `update-pr`.
- Changing `check_toolkit.py` or the installer.
- A visual-proof section or any other new body section.

## Decisions

**The predicate is a type gate plus a diff judgment.** A group needs no tests when its type is `chore`,
`build`, `ci`, `docs` or `revert` and the model judges that no changed file alters behavior. The type is
deterministic and cheap; the judgment is needed because `chore` also covers dependency changes, scripts
and tooling code. Alternatives: a fixed path list (rejected: this repository's `toolkit/commands/` means
nothing elsewhere, and its Markdown is behavior); judgment alone (rejected: a `feat` group could be
judged away); widening the gate to `refactor` and `style` without tests (rejected: outside the issue).

**The judgment uses behavior classes, not paths.** Code, tests, migrations and files that instruct an
agent or tool (prompts, skills, commands, hooks, workflows) are behavior; prose, specs, comments,
manifests, lockfiles and formatting are not. Extensions are hints only. A `ci` workflow change is
therefore treated as behavior.

**Uncertain means tests.** Showing a spare testing section costs a reviewer a glance; hiding a needed
one costs a missing check.

**The author can override at step 7.** The presentation already accepts change requests and a new
confirmation word, so the classification and its reason are shown there and nothing new is needed to
override it.

**Reviewer steps keep the grounding rule and add the conversation as a source.** A command seen run in
the conversation is not invented, so a `chat` run step needs no document. Targeted steps come from the
group's new tests, `tasks.md`, commit bodies and the conversation; the generic test command may follow
but is not the only step when the group's own check can be named. A summarized conversation contributes
nothing, as for Author Verification.

**Both commands change; they stay separate.** The shared sections must match, so the same text goes into
both. Merging would widen `write-pr`'s permissions to `rebase` and force-with-lease, weaken its
never-force-push rule and rewrite the specs; it is a separate change.

**One-line summary is the Summary section only.** The body keeps Summary, Related Issues, Type of
Change and Changes Made for a no-tests group; only the testing block goes.

## Risks / Trade-offs

- [The judgment misclassifies a behavior-changing file as docs] -> Uncertain defaults to tests,
  instruction files count as behavior, and the author sees the classification before anything opens.
- [A `chat` run step is stale or from another directory] -> The existing run rules apply: it must cover
  a directory the diff changes, a later edit makes it out of date, and its paths must exist.
- [Drift between the two commands] -> The existing docs check covers the shared sections; step 5 and 8
  wording in `update-pr` is edited by hand to match.
