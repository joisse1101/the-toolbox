## Context

`checkSpec` in `toolkit/skills/jois-story-plan/diagrams/checks.js` branches on one value, `repo`, which is `null` (no code read) or an object (the `--repo` flag). Without it, Implementation overview and Traceability must read `TBC` and any file path is rejected (`FILE_PATH`, line 245). With it, each traceability row needs a `file::symbol`, and "the skill read the file" is the skill's own rule, not checked. A story that builds the code has no code to read, so neither branch fits it. The motivation is in the proposal.

## Goals / Non-Goals

**Goals**
- A story that builds the code can record its build plan and the files it will create, and the writer accepts it.
- The writer's error points to that mode.
- The mode is chosen by an explicit question, not assumed.

**Non-Goals**
- A slice mixing existing and planned code, which needs a per-row marker.
- Judging whether a planned path is sensible; the writer checks format only.
- Any change to `--repo`.

## Decisions

### The document carries the mode, not a flag

The `Maturity` row reads `planned (greenfield)`. The existing no-repo check, `/^planned\b/i`, already accepts that value, so describe-only slices are unaffected. A new `--greenfield` flag was rejected: the mode would live only in the command, so a reread or a redraw could lose it, and `--check` and the write could disagree. It also keeps `--repo` meaning one thing, "I read the code".

### Greenfield checks in `checkSpec`

A third branch next to the `!repo` and `repo` branches, entered when Maturity matches `/^planned\s*\(greenfield\)/i` and `repo` is `null`. If `repo` is set with a greenfield Maturity, the writer reports the contradiction. In the branch:

- Implementation overview must not read `TBC` and must not be empty.
- Each Traceability row's Code cell holds at least one `` `file::symbol` `` and the word `planned`.
- A file path anywhere requires at least one `user-confirmed` row in `## Design decisions` whose Decision text mentions layout or stack. This is a loose text check; the skill's design checkpoint is what really asks the question.
- A decision with source `repo` is refused, as it already is without `--repo`.

The path rule reuses `FILE_PATH`; only the condition that triggers the error changes.

### Error text

The two messages (`"<h>" must read TBC without a repo` and `names a file path ... with no repo read`) gain a clause: "a story that builds the code from scratch uses greenfield mode (conventions, section 5)". The clause is added only on the non-greenfield branch, where it can help.

### Skill text

`SKILL.md` gets a mode question inside "Decide the scope first", asked when the folder holds little or no code for the flow, and a sentence in "A rejected check or write" telling the skill to read the conventions section the error names. The conventions' section 5 is renamed "Modes" and describes the three modes, and the describe-only paragraph in "Draft the slice" is narrowed to match. `metadata.version` goes to 1.1.0.

## Risks / Trade-offs

- **A loose text check on the layout decision** can be satisfied by a decision that only mentions the word. Accepted: the writer cannot know intent, and the same weakness exists for `--repo`. The mitigation is the checkpoint rule in `SKILL.md`, which asks the layout of every planned path.
- **The Maturity text is parsed by regex.** A user editing it by hand could break the mode. The writer's error names the expected value.
- **Existing slices** all have Maturity `planned` or a repo-level value, so none read as greenfield and none change behavior.
