## Why

As a backlog grows, the same idea gets several names across stories ("user", "customer", "member") and the same word gets several meanings ("attribute" of a dataset vs. of a user). Nothing records what a term means, so stories drift apart and the AI skills guess. A per-backlog lexicon gives the team one place to define terms, and gives the skills something to draft against.

## What Changes

- New **Lexicon** tab in the story portal for the open backlog: a searchable list of terms with an add/edit/delete form.
- A lexicon is one CSV file per backlog, `lexicons/<backlog file name>` in the data folder (the lexicon of `IAM.csv` is `lexicons/IAM.csv`), so it opens in Excel like the other files. Each row is a term with columns `Term`, `Part of` (a parent term, so "Dataset attribute" sits under "Dataset"), `Definition` (required), `Avoid` (a `;`-separated list of synonyms stories must not use) and `Notes`. Terms are unique ignoring case; names are the full phrase used in stories. Unknown columns are kept.
- Validation: a parent must exist and not form a cycle, an `Avoid` word may not be another term's name, a parent cannot be deleted while children point at it, and renaming a term updates the `Part of` of its children.
- The file API gains a `lexicons` store, a CSV store like the others.
- The lexicon is backed up with its backlog and compared in the Backups tab, like the review and the proposals.
- `read-story-context.mjs` prints the lexicon after the backlog and proposals, so `explore-stories` and `propose-stories` use the agreed terms and avoid the banned ones.
- `propose-stories` (and `/story:propose`) can add and patch lexicon terms through a new `write-lexicon.mjs`, shown in the same reply and the same single yes/no as stories and edits, and written before them so new stories can use a term defined in the same run. Lexicon changes go straight into the file (no staging area).
- The locked sessions' guard allows exactly one more command, `write-lexicon.mjs <file>` with a heredoc, in `--read-write` mode only.

Not in this change: `review-backlog` flagging stories that use an avoided term, and a "used in N stories" count. Each can follow.

## Capabilities

### New Capabilities
- `backlog-lexicon`: the lexicon file format, term rules and validation, parse/compose logic, and the Lexicon tab.
- `lexicon-writer`: the `write-lexicon.mjs` script the propose skills use to add and patch terms, with its input format and validation.

### Modified Capabilities
- `csv-file-store`: a backup of a backlog also holds its lexicon, and the Backups comparison also covers it.
- `story-writing-skills`: the context reader also prints the lexicon; the propose skill drafts and writes lexicon changes in its single confirmation; the guard allows the lexicon writer in read-write mode.

## Impact

- `core/`: new `lexicon.js` (parse, compose, validate, rename) and its test; `backup.cjs` lists the `lexicons` store.
- `app/backend/server.cjs`: `lexicons` entry in `STORES`.
- `app/frontend/user-story-generator/`: new `LexiconTab.jsx`, a `useLexicon` hook with autosave like the other hooks, a small `serialize` option on `useAutosave`, tab wiring in `App.jsx`.
- `.claude/skills/`: `explore-stories/read-story-context.mjs`, `explore-stories/guard-bash.mjs`, new `propose-stories/write-lexicon.mjs`, both `SKILL.md` files and `/story:propose`.
- `CLAUDE.md` and `README.md` architecture notes; `data/lexicons/` is git-ignored like the rest of `data/`.
