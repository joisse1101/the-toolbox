# Design

## Context

The flow is `jois-story-plan` → `/jois-code:apply` → `/jois-code:validate` → `/jois-code:archive` → `/jois-git:write-pr`. Today each `jois-code` command says the slice folder is untracked and never stages it, and archive's rules say it never deletes a file of the slice. These files are read after archive today, which shapes the order of the steps below:

| File | Read after archive by |
|---|---|
| `source.json` | `read-diagrams.mjs` (plan and verify list slices with it; the plan writer refuses to overwrite a slice of another scope with it), archive's `Stories` column |
| `tasks.md` | archive, to find the slice; `read-diagrams.mjs` counts its tasks |
| `validation.md` | archive's readiness check on a rerun; `write-pr` and `update-pr` |
| `review.md` | archive's review step on a rerun; `write-pr` and `update-pr` |

`/jois-code:review` and `/jois-code:validate` do not read their own result files back. Validate reads only `ARCHIVED.md`. `jois-story-verify` reads `UC-<slice>.md` and `tasks.md` through `read-diagrams.mjs`, so it has nothing to read on a reduced slice, which is correct.

The story skills get shared text through `planner/scripts/sync-skill-logic.mjs`: guideline files in `planner/guidelines/` are copied into each story skill's `references/`, and logic modules in `planner/logic/` into each skill's `lib/`. This change depends on `flexible-slice-argument`, which rewrites how apply and archive find a slice.

## Goals / Non-Goals

**Goals:**

- A reduced slice holds `ARCHIVED.md` and `source.json`, and every later reader still works.
- One source for the file table, used by both the docs and the `.gitignore` printer.
- No skill writes `.gitignore` or commits without the user's yes.

**Non-Goals:**

- Changing the portal, or the files it writes outside the data folder.
- Reducing slices archived before this change automatically. A rerun of archive on such a slice offers the delete at its end.
- Re-recording the story-to-code sample. Its saved `archived` stage keeps the old `ARCHIVED.md`; re-recording costs model tokens and is asked for separately.

## Decisions

### `source.json` stays

Three readers need it after archive, and it is a few lines. Teaching `read-diagrams.mjs` to recognise archived slices without it was the alternative, but that changes a script, its tests and the plan writer's scope check for no gain in clarity. So the reduced folder is `ARCHIVED.md` plus `source.json`, both committed.

### The summary goes into `ARCHIVED.md`, and the PR commands read it

The PR commands run after archive, and they need the verdict counts and the review's open items. Keeping `validation.md` and `review.md` until the PR was the alternative, but then nothing deletes them reliably. So archive copies the summary into `ARCHIVED.md` before the delete. The added part of `ARCHIVED.md`:

```
## Validation

| | |
|---|---|
| Tested commit | `<sha>` |
| Run | full |
| Claims | 12 met, 0 not met, 0 could not test |

## Review

| | |
|---|---|
| Review | run |
| Reviewed commit | `<sha>` |
| Fix rounds | 1 |
| Checks | static run, behavioural run |

### Known, not fixed

- <verbatim line>, or: See [<heading>](../../../wiki/<topic>/design.md#<anchor>)

### Not fixed by design

- <verbatim line>, or the same link
```

The PR commands' shared section learns one more source, `ARCHIVED.md`, after a current `validation.md` or `review.md`. Both commands change identically, because a test keeps their shared sections equal.

### A script deletes the working files

Archive's `allowed-tools` limits its writes to `wiki/**` and `ARCHIVED.md`. A shell `rm` would need a broad permission. So the plan skill gets `remove-working-files.mjs <backlog> <slice>`, which deletes only the five working file names, only when `ARCHIVED.md` exists in that folder, and prints each file it removed and whether git tracked it. Archive pre-approves exactly that script. A `--check` flag prints the same list without deleting, and archive uses it to build the question. A tracked deleted file shows up in `git status` as deleted and is staged with `git add` on its path like any other.

### Order of archive's last step

1. Write the wiki pages and run the docs check, as today.
2. Offer the known limits section (spec "Review facts the wiki lacks are offered before the delete"), and rerun the docs check if it was written. A line the wiki already states is found by meaning (key terms searched in `wiki/`, the surrounding section read) and is not offered; its wiki page and heading are noted.
3. Write `ARCHIVED.md` with the summary and read it back. A line the wiki already states is written as one link to that section, `See [<heading>](<path>#<anchor>)`, and not as the line.
4. Run `remove-working-files.mjs --check`, ask "Delete them" or "Keep them" with the untracked warning, and on "Delete them" run it without `--check`.
5. Stage the wiki paths, `ARCHIVED.md`, `source.json` and the deleted tracked files by explicit path, skipping what `git check-ignore` reports. Propose `docs(wiki): archive <backlog>/<slice>`, name one confirmation word and end the turn.

Archiving a slice is one concern: the wiki gains the slice's content and the slice folder gives up its copy, so both halves go in one commit. Step 4 happens before staging, so the commit never holds the wiki change without the matching delete.

### The file table is data in the logic layer, and a guideline for people

`planner/logic/skill-support/plans-files.mjs` exports the rows as data: `{ path, writer, lifecycle: ['committed'] | ['local'] | ['user decides', 'removed by archive'] | ['local', 'removed by archive'] }`. `planner/guidelines/plans-files.md` is the readable table, and a planner test checks both list the same paths and lifecycles. The sync script copies the guideline into each story skill's `references/` and the module into `jois-story-plan`'s `lib/`. The `jois-code` commands link to the plan skill's copy, because they already locate that skill folder.

The rows:

| Path under `<backlog>/` | Written by | Lifecycle |
|---|---|---|
| `user-stories.csv` | portal, `jois-story-plan` (Frozen cell) | committed |
| `lexicon.csv` | portal, `jois-story-propose` | committed |
| `backlog.json` | portal (story-ID initials) | committed |
| `context-map.json`, `context-map.md` | `jois-story-plan` | committed |
| `user-stories/proposals.csv` | `jois-story-propose` | local |
| `user-stories/review.csv`, `review.csv.decided` | `jois-story-review`, `jois-story-propose`, portal | local |
| `lexicon/lexicon-suggestions.csv` | `jois-story-propose` | local |
| `slices/<slice>/source.json` | `jois-story-plan` | committed |
| `slices/<slice>/ARCHIVED.md` | `/jois-code:archive` | committed |
| `slices/<slice>/UC-<slice>.md`, `tasks.md` | `jois-story-plan`, `/jois-code:apply` (ticks) | user decides, removed by archive |
| `slices/<slice>/review.md` | `/jois-code:apply` | local, removed by archive |
| `slices/<slice>/validation.md`, `validation.partial.md` | `/jois-code:validate` | local, removed by archive |

### The printed `.gitignore` block

`print-gitignore.mjs` (plan skill) prints the block for the data folder `.plans` at the project root; for a data folder elsewhere inside the project it uses that path, and for one outside the project it says no block is needed. `init-plans.mjs` prints the same block after "Created .plans". Nothing writes `.gitignore`. For `.plans` the block is:

```gitignore
# planner data: committed files only (printed by jois-story-plan/print-gitignore.mjs)
!.plans/
.plans/*
!.plans/*/
.plans/*/*
!.plans/*/user-stories.csv
!.plans/*/lexicon.csv
!.plans/*/backlog.json
!.plans/*/context-map.json
!.plans/*/context-map.md
!.plans/*/slices/
.plans/*/slices/*
!.plans/*/slices/*/
.plans/*/slices/*/*
!.plans/*/slices/*/ARCHIVED.md
!.plans/*/slices/*/source.json
!.plans/*/slices/*/UC-*.md
!.plans/*/slices/*/tasks.md
```

The `user decides` files are re-included so a plain `git add` works; they show as untracked until the user commits them or declines. Ignoring folder contents rather than folders keeps every re-include working, because git cannot re-include a file under an ignored folder. The leading `!.plans/` lines undo a broader ignore the project may already have.

### Plan's commit question

`jois-story-plan` asks after the freeze, the last write of a plan. It checks `git rev-parse --is-inside-work-tree` and `git check-ignore` on `tasks.md` first, and does not ask when either rules it out. On "Yes, commit" it stages `UC-<slice>.md`, `tasks.md` and `source.json` by path and commits `docs(plans): plan <backlog>/<slice>`. Picking "Yes, commit" counts as the confirmation of the user's commit rule. `allowed-tools` gains `AskUserQuestion`, `Bash(git rev-parse:*)`, `Bash(git check-ignore:*)`, `Bash(git add *slices*)` and `Bash(git commit:*)`. The freeze also changes `user-stories.csv`, but that file is the portal's; the question names it and leaves it to the user.

### Apply commits a tracked `tasks.md`

Once `tasks.md` is tracked, apply's ticks would otherwise leave it modified after every group. So apply stages it with each group's commit when `git ls-files` lists it. Apply's "the slice folder is untracked, never stage it" lines become "stage `tasks.md` only when tracked; never stage `review.md`".

## Risks / Trade-offs

- [The user deletes working files that were never committed] → The question says the delete is permanent, and the summary is in `ARCHIVED.md` before anything is deleted.
- [A PR for a reduced slice lists fewer details than before] → The per-claim rows are lost, but the counts and open items stay; a `not met` claim cannot reach archive anyway, because archive needs `Validated: yes`.
- [The guideline and the data module drift] → A planner test compares them.
- [`archive.md` is also changed by `flexible-slice-argument`] → That change is archived first; this one builds on its `## Finding the slice` section and moves the glob key from `tasks.md` to `source.json`, so a reduced slice is still found.

## Migration Plan

Slices archived before this change keep all their files. When a user reruns archive on one, the run ends with the same delete question. The user's own `.gitignore` is changed by the user, from the printed block. Rollback is reverting the commands and skills; deleted working files of untracked slices cannot be restored, which the question states.
