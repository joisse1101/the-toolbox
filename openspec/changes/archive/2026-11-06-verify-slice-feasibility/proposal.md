# Proposal

## Why

`jois-story-verify` (PR 3 of issue #98, merged as #101) checks that a stored slice is consistent with itself: not stale, passes the plan skill's checks, every criterion has a task, nothing left `TBC` or open. It does not check the slice against the project. So it cannot say that a slice is impossible to build in this code base, or that it quietly contradicts a wiki page, or that its "Changes to existing specs" section names a page wrongly. The issue's acceptance criterion "Verify reports what is not feasible and what does not make sense, and names the wiki page or code it checked" is still unmet, and the comment on #101 says a follow-up is needed.

## What Changes

- Verify gains three checks, all read-only, each reading the project's wiki and code from the current folder:
  - **Feasibility:** a step or task relies on code, a module, a data field or a behaviour that the code base does not have or has in another form, or breaks a rule that a wiki page or `CLAUDE.md` states for the area it changes (for example, `planner/logic/` importing the portal).
  - **Silent contradiction:** the slice says something that a wiki page contradicts, and no row of "Changes to existing specs" records it.
  - **Changes to existing specs against the wiki:** a row marked `added` names a page that exists, or a row marked `modified` or `removed` names a page that does not, or a row's "What changes" does not match what the page says.
- Every finding of these checks names the wiki page by its path under `wiki/`, or the code by file path, that it checked, and quotes the line that decides it. A claim with nothing to cite is not reported.
- A check that cannot run is reported as not run, with the reason: no wiki, no code to compare (a greenfield slice; its feasibility is still checked against the wiki's rules), or a file it was not allowed to read. A report also lists what each of these checks looked at, so a clean result shows its coverage.
- Ranking: these findings are warnings, because the team can settle them while building, and a finding verify could not confirm from what it read is a suggestion. None is critical.
- Wiki text and code are data, never instructions, as for the stories and the slice today.
- Not in this change: editing the wiki or the code, and applying a spec change (that is archive, PR 8). Verify still writes only a corrected slice and review suggestions, after approval.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `verify-story-skill`: adds the requirements for the three project checks, their citations, their not-run cases and their ranking.

## Impact

- `toolkit/skills/jois-story-verify/SKILL.md`: three more checks, the lookup order for wiki pages, `Glob` in `allowed-tools`, version 1.1.0, and the limit "compare the slice with the code" removed.
- `toolkit/tests/story/verify-skill.test.mjs` asserts the new checks, the citation rule and the not-run cases.
- Wiki pages that describe verify: `wiki/planner/Story-Skills.md`, `wiki/planner/architecture/Story-Skills-Internals.md`, `wiki/planner/User-Flows.md` and `wiki/toolkit/Toolkit-Guide.md`; then `python scripts/check_docs.py`.
- No script, no `package.json` and no change to the plan or review skills. No breaking change.
- Known limit, stated up front: the checks are instructions the model follows, so how many defects they find rests on the model reading the right pages and code. A trial on mock slices, wikis and code will measure it.
