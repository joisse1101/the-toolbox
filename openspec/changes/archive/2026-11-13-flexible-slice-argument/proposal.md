# Proposal

## Why

`/jois-code:apply` and `/jois-code:archive` accept only the exact argument `slice <backlog>/<slice>`. Anything else, such as a bare slice name, `<backlog> <slice>` with a space, or no argument at all, is refused with a request to type it again. The user rarely remembers the backlog name, so most first tries fail. Both commands can find the slice themselves, because the slice folders sit in a known place.

## What Changes

- `/jois-code:apply` and `/jois-code:archive` accept the slice in any of these forms: `slice <backlog>/<slice>`, `<backlog>/<slice>`, `<backlog> <slice>` (with or without the word `slice`), a slice name alone, a backlog name alone, or nothing.
- When the argument names one slice, the command uses it and says which backlog and slice it picked.
- When the argument does not settle the slice (a backlog name alone, nothing, a slice name found in more than one backlog, or a word that names nothing), the command asks with AskUserQuestion. It lists the slices it can act on: apply lists slices with an unticked task, archive lists slices that have every task ticked and no `ARCHIVED.md`.
- Both commands still never guess between two matches, and still read or write nothing outside the slice lookup until the slice is settled.
- Each command ends by printing its full `slice <backlog>/<slice>` form, so a rerun can be copied.
- **BREAKING (wording only):** the "any other argument is refused" rule of both commands is removed. Calls that already use `slice <backlog>/<slice>`, such as apply's call to `/jois-code:review`, keep working unchanged.
- Not changed: `/jois-code:validate`, `/jois-code:review` and `jois-story-verify` keep their argument rules.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `code-archive`: the requirement "Archive takes one slice" changes from one exact form to the forms above, with a question when the slice is not settled.
- `toolkit-skills`: the requirement "Apply orchestrator command takes a slice" changes the same way.

## Impact

- `toolkit/commands/jois-code/apply.md`: the Argument section and step 1. `allowed-tools` gains `AskUserQuestion`.
- `toolkit/commands/jois-code/archive.md`: the Forms section and step 1.
- `toolkit/tests/test_task_applier.py` and `toolkit/tests/test_archive_command.py`: the assertions on the refusal text change to the new rule.
- Docs: `wiki/toolkit/Command-Details.md`, `wiki/toolkit/Toolkit-Guide.md`, `wiki/Story-To-Code.md` and `wiki/toolkit/Task-Recipes.md` describe the accepted forms.
- No script changes. The lookup uses Glob over slice folders and the existing `read-diagrams.mjs` output.
