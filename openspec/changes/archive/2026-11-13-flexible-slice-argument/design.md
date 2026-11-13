# Design

## Context

Both commands are prompt files that Claude follows, not scripts. They already find a slice with Glob, `**/<backlog>/slices/<slice>/tasks.md`, and already ask when that Glob finds more than one folder (for example a copy under `.trees/`). Archive's `allowed-tools` already holds `AskUserQuestion`; apply's does not. The data folder can sit at `.plans/` or wherever `planner.config.yaml` points, so the commands find slices by the folder shape `<backlog>/slices/<slice>/` rather than by a fixed root. The requirements are in `specs/code-archive/spec.md` and `specs/toolkit-skills/spec.md`.

## Goals / Non-Goals

**Goals:**

- One lookup rule, worded the same in both commands.
- No new script and no new read outside the project.

**Non-Goals:**

- `/jois-code:validate`, `/jois-code:review` and `jois-story-verify` keep their argument rules.
- Fuzzy matching of mistyped names. A name that matches nothing leads to the question, not to a guess.

## Decisions

### Find slices with Glob, not a script

The lookup reads the argument as one or two words, after dropping a leading `slice` and splitting on `/` or a space. It then globs `**/slices/*/tasks.md`, narrowed by the words it has:

| Words | Glob | Result |
|---|---|---|
| backlog and slice | `**/<backlog>/slices/<slice>/tasks.md` | one match runs; none says the slice was not found and asks |
| one word | `**/<word>/slices/*/tasks.md` and `**/slices/<word>/tasks.md` | a backlog match lists its slices and asks; one slice match runs; several slice matches ask which backlog; both kinds of match ask; none says so and asks |
| none | `**/slices/*/tasks.md` | lists and asks |

Glob is already allowed and already used for this, so no script, permission or install step is needed. The alternative was `read-diagrams.mjs` with no backlog plus `read-backlog.mjs` for the backlog list, but that needs one script per backlog, and apply would need the review skill installed only to list backlogs.

The glob key stays `tasks.md`, the file both commands already require. The later tidy-up change, which deletes `tasks.md` at archive, moves the key to the slice folder or `source.json`.

### Skip copies that are not the project's own slices

A Glob from the project root also finds slices in other worktrees (`.trees/`), in scratch copies (`.scratch/`), in `node_modules/`, and in test or sample data (`test/`, `tests/`, `sample/` anywhere in the path). The lookup drops those matches first. Only when nothing is left does it use them, and then it lists their paths and asks which one, as today. Without this, a bare slice name in this repo would always end in a "which copy" question.

### When the search finds nothing

The data folder can sit outside the project when `planner.config.yaml` points there, and Glob from the project root does not see it. So when the search finds nothing and the argument named a backlog, the command runs `read-diagrams.mjs <backlog>`, which reads the config, and takes the slice list from its output (one `<slice> | <scope> | ... ` line per slice and a `tasks: <done> of <total> done` line under it). When no backlog was named and the search finds nothing, the command says it found no slices in the project, names the three places the scripts look (`PLANNER_CONFIG`, `.plans`, `planner.config.yaml`), and asks the user to type `<backlog>/<slice>`. Both commands already have permission to run `read-diagrams.mjs`, so no permission changes.

### Each command lists only the slices it can act on

- Apply lists a slice when its `tasks.md` has an unticked task line (`- [ ]`), found with Grep over the matched files.
- Archive lists a slice when its `tasks.md` has no unticked task line and the folder has no `ARCHIVED.md`.

A slice outside the list can still be typed in the question's free-text answer. Archive's rerun of an archived slice keeps working that way. The list is a convenience, not a gate: the checks of each command's later steps still decide whether it can run.

### More slices than the question can show

AskUserQuestion shows at most four options plus free text. When more slices qualify, the reply lists them all as plain text before the question, and the question offers the first three by name, plus the free text answer. The order is by backlog name, then slice name, so it is stable between runs.

### The rule is written in both files, kept equal by a test

The two commands are installed as separate files, and a command cannot include another file. A shared reference in a skill folder would add a read outside the project for archive, whose rules allow only listing a skill folder to find a script. So the rule is a short `## Finding the slice` section in each command, and a test checks the two sections are identical text except for one line, the list filter, which starts with `Slices this command lists:`. The section never names its own command: the end line says "print this command's full form, `slice <backlog>/<slice>`, with the real names", so the same words fit both files. This keeps the two copies from drifting without a runtime read.

### Copies under `.trees/` and other folders

When the same `<backlog>/slices/<slice>` matches in more than one place, the existing rule applies: list the paths and ask which one. This is not new behaviour, only moved into the shared section.

## Risks / Trade-offs

- [A backlog and a slice share a name] → The lookup treats it as two kinds of match and asks, so it never picks one silently.
- [A Glob from the project root also finds copies in worktrees under `.trees/`] → Those matches are dropped unless nothing else is found, and then the user is shown the paths and picks one.
- [A real backlog folder sits under a path named `test/` or `sample/`] → It is still found when nothing else matches, so the user can pick it from the question.
- [The data folder is outside the project and no backlog was named] → The command cannot list slices; it says so, names where the scripts look, and asks for `<backlog>/<slice>`.
- [Removing the strict refusal changes tests that assert the old wording] → The tests are rewritten in the same change to assert the new rule and the equality of the two sections.
