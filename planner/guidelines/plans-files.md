# Files under the data folder

This page lists every file the story skills, the `jois-code` commands and the planner portal write under `<data folder>/<backlog>/`, who writes each one and how long it lives. Read it to decide what belongs in git before any skill runs. The same table is kept as data in `planner/logic/skill-support/plans-files.mjs`, and a test fails when the two differ.

## The table

| Path under `<backlog>/` | Written by | Lifecycle |
|---|---|---|
| `user-stories.csv` | portal, jois-story-plan (Frozen cell) | committed |
| `lexicon.csv` | portal, jois-story-propose | committed |
| `backlog.json` | portal (story-ID initials) | committed |
| `context-map.json` | jois-story-plan | committed |
| `context-map.md` | jois-story-plan | committed |
| `user-stories/proposals.csv` | jois-story-propose | local |
| `user-stories/review.csv` | jois-story-review, jois-story-propose, portal | local |
| `user-stories/review.csv.decided` | jois-story-review, jois-story-propose, portal | local |
| `lexicon/lexicon-suggestions.csv` | jois-story-propose | local |
| `slices/<slice>/ARCHIVED.md` | /jois-code:archive | committed |
| `slices/<slice>/source.json` | jois-story-plan | committed |
| `slices/<slice>/UC-<slice>.md` | jois-story-plan | user decides, removed by archive |
| `slices/<slice>/tasks.md` | jois-story-plan, /jois-code:apply (ticks) | user decides, removed by archive |
| `slices/<slice>/review.md` | /jois-code:apply | local, removed by archive |
| `slices/<slice>/validation.md` | /jois-code:validate | local, removed by archive |
| `slices/<slice>/validation.partial.md` | /jois-code:validate | local, removed by archive |

## The lifecycles

`committed` files belong in git. The planner and the skills expect them to be there for the next person, so the printed `.gitignore` block re-includes each one.

`local` files stay on the machine. They are working notes, such as proposals and review decisions, and the block ignores them.

`user decides` files are the slice's plan: the use-case file and the task list. The block re-includes them so a plain `git add` works, and they show as untracked until the user commits them or leaves them out.

`removed by archive` files are working files that `/jois-code:archive` deletes once `ARCHIVED.md` holds their summary. A reduced slice keeps only `ARCHIVED.md` and `source.json`.

## Printing the block

Run `node <jois-story-plan folder>/print-gitignore.mjs` from the project root. It prints a `.gitignore` block built from the table for the data folder it resolves, and never writes a file. The user reviews the block and adds it to `.gitignore` themselves. When the data folder is outside the project, the script says no block is needed.

The block ignores the contents of each folder (`.plans/*/slices/*/*`) and never the folder itself, because git cannot re-include a file under an ignored folder.
