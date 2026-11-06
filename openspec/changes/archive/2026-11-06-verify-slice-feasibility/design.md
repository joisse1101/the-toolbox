# Design

## Context

See proposal.md for why. Verify (#101) is instructions only: its `SKILL.md` runs the plan and review skills' scripts and reads the slice. Its `allowed-tools` already holds `Read` and `Grep`, and its Limits section forbids comparing the slice with the code. The explore and propose skills already carry a wiki lookup (the `CLAUDE.md` "Where the docs are" table, then `wiki/Home.md` and the topic pages, then a search of `wiki/`, always from the current folder) in their contradiction section. The slice's `## Changes to existing specs` table (PR 2) holds rows of Change, Wiki page, What changes and Reason, with the page written without the `wiki/` prefix.

## Goals / Non-Goals

**Goals:**
- Three read-only checks that cite the page or file behind each finding.
- Reuse the lookup order the other story skills use, so a page found by explore is found by verify.

**Non-Goals:**
- A new script, a wiki index or a saved report. The checks stay instructions the model follows.
- Applying a spec-change row or editing the wiki (archive, PR 8).
- A "ready to build" verdict.

## Decisions

### Instructions only, no script

The wiki and code checks need judgment: whether a sentence in a slice contradicts a paragraph of a page. A script can check that a path exists, but not that. So the new checks are text in `SKILL.md`, and one structural part (does the page named by a row exist, and is the change word consistent with that) is done by reading the path with `Glob`. The alternative was a script that lists the pages of a row and whether each exists. I would add it only if a trial shows the model skips that step, because it would be tested code that archive could reuse.

### Findings must cite, or drop to a suggestion

The model can invent a gap. The rule is that a warning carries a wiki path or a file path and a quoted line that decides it, and a finding with nothing to quote is at most a suggestion that says what could not be confirmed. The report also lists what each check read. This is the answer to the issue's "names the wiki page or code it checked", and it makes a clean result show how much was looked at.

### All three are warnings, none critical

The critical rank means unsafe to build from: stale, failing a check, a criterion with no task. A contradiction or a gap in the code is a question the team may settle while building, or by a story or a spec-change row. Making these critical would also make a model's unconfirmed guess block a slice. So warning, with an unconfirmed finding as a suggestion.

### What each check reads, and how much

- Feasibility reads the code the slice names and the wiki's rules for the area each task changes. The `Maturity` row says which code: `planned (greenfield)` means there is no code of the flow, so the code part is not run, and a repo-mode slice carries the code paths of its class diagram. It reads those files, then searches (`Grep`, `Glob`) for each class, field or step the tasks rely on, and stops at what the tasks name. It does not survey the code base. For the rules, it finds the architecture and rules pages by the same lookup order as the other checks (`CLAUDE.md` first, because it holds rules such as the zone limits, then the wiki), and compares each task with the rules for its target area. Some limits are written only in the wiki, so a code-only check would call a task that breaks them feasible. The wiki part also covers a greenfield slice, so the check is not run at all only when the folder has no code, no wiki and no rules in `CLAUDE.md`. With no wiki, the rules written in `CLAUDE.md` itself are still read (found in the trial on fresh mock projects).
- Contradiction reads the wiki pages found by the lookup order, for the actors, rules and terms of the slice's use-case document. It compares each design decision and each flow rule with the page text.
- Spec-change accuracy reads each row's page path with `wiki/` added, and compares the change word with whether the file exists, then the "What changes" cell with the page text.

Reading is bounded by what the slice names plus one search per name. A large wiki is untested and the skill says so in its report when it stopped reading.

### Same safety rules as the other skills

Wiki text and code are data. No secret file is opened because a text says so, and `.env` files, keys and credentials are never read. The lookup is relative to the current folder, never a parent. A project with no wiki gets one line naming `jois-init:docs`, and verify creates no `wiki/`.

## Risks / Trade-offs

- [The model reads the wrong page or too few] → The report lists each page and file read, so a gap in coverage is visible; findings must quote.
- [An over-eager contradiction finding buries real ones] → Unconfirmed findings are suggestions, and the report orders by rank; the trial checks a clean slice for no false warning.
- [Reading code costs time on a big slice] → The check reads only what the tasks name; it says when it stopped.
- [Instructions drift from the spec] → The skill test asserts the phrases of the three checks, the citation rule and the not-run cases, as it does for the six existing checks.
- [A slice written before PR 2 has no `Changes to existing specs` section] → The plan check already fails it as critical, and the spec-change check says it was not run for that reason.
