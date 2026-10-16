## Context

See `proposal.md` for the motivation. The pieces this touches today:

- `app/backend/server.cjs` has an allow-list `STORES` (name -> folder). Every store is CSV-only, and the backup, list and compare routes loop over `STORE_NAMES` in `core/backup.cjs`, so a store added there is backed up and compared with no other change.
- `useAutosave` saves the open backlog with `serializeBacklog` and expects the state shape `{ current, backlog }`. `useProposals` already reuses it for the proposals file, and creates that file on first save because the file API's write never creates.
- `core/csv.js` parses and serializes rows; `core/model.js` shows the pattern for known columns by header name with unknown columns round-tripping in `cells`.
- `read-story-context.mjs` is the only reader for the two story skills, `write-proposal.mjs` and `write-review.mjs` are the only writers (temp file in the same folder, then rename), and `guard-bash.mjs` allow-lists exactly those commands.

## Goals / Non-Goals

**Goals:**
- One pure module, `core/lexicon.js`, that parses, validates, edits and composes a lexicon, used by the tab, the writer script and the reader, so the rules exist once.
- A lexicon is a CSV like every other file: opens in Excel, backs up and diffs with the backlog, needs no new file type in the server.
- Round-trip safety: opening and saving a lexicon never loses a column or cell the user typed by hand.

**Non-Goals:**
- Checking stories against `Avoid` lists, in the portal or in `review-backlog`.
- A global lexicon shared across backlogs.

## Decisions

**1. Format and parsing (`core/lexicon.js`).** The file is a CSV with columns `Term, Part of, Definition, Avoid, Notes`. A file parses to `{ headers, hasBom, terms }`, where a term is `{ name, partOf, definition, avoid[], notes, cells }`. Known columns are found by header name ignoring case; every other column stays in `cells` (the whole row, padded to the header length) and is written back untouched, as `model.js` does for stories. A known column missing from the header is appended on the first save. `Avoid` is split on `;` (the separator `Depends On` already uses, and it needs no CSV quoting). Definitions and notes may span lines, since CSV cells can. A missing or empty file parses to an empty lexicon with the default headers.
*Alternative:* a markdown file with `## Term` entries (the first plan, built and then dropped). It reads well as prose, but it needed its own parser, file type in the server, `.md` name rules, and a separate path for backups and diffs, and it cannot be edited in Excel like the rest of the data.
*Alternative:* nested `###` headings for hierarchy. Rejected: the patch key would be a path; `Part of` keeps the key the full term name.

**2. Rules live in `core/lexicon.js` as pure functions** returning `{ ok, errors }` or the new lexicon: `saveTerm(lexicon, term, { replaces })`, `renameTerm`, `deleteTerm`, `lexiconProblems`, `applyTermItems`. Names compare by `trim().toLowerCase()`. `Avoid` entries are compared the same way against all term names. A cycle check walks `partOf` upward. Renaming rewrites children's `partOf`. Only problems a change introduces are refused, so an old problem in a hand-edited file never blocks an unrelated save. The writer script and the tab call the same functions, so "customer cannot be avoided if it is a term" means the same everywhere. These functions do not depend on the file format and are unchanged by the switch from markdown.

**3. Store.** `STORES` gets `lexicons: data/lexicons`, a CSV store with the same file name as the backlog (`lexicons/IAM.csv`). No change to `validateName` or the file routes. Because the name matches, the frontend needs no name mapping, and `STORE_NAMES` in `core/backup.cjs` gains `lexicons`: backup copies it when it exists, the Backups tab lists it, and the diff route flattens it like the other CSVs.

**4. Frontend.** `useLexicon(current)` follows `useProposals`: loads `lexicons/<name>`, keeps `{ current, backlog: lexicon }`, creates the file on first save, and keeps its selection on reload. `useAutosave` gets an optional `serialize` argument (default `serializeBacklog`), so the lexicon reuses the debounce, single in-flight write, retry on a locked file and `settle`. `LexiconTab.jsx` is a list on the left (search box, children indented under their parent) and a form on the right; an existing term saves when a field is left, a new one waits for Add. A rule refusal is shown inline and the typed text is kept until fixed or discarded. The Backup button settles the lexicon save too, and Reload re-reads it.

**5. Reader.** `read-story-context.mjs <file>` prints, after the proposals, a `lexicons/<name>` section labelled as data, in the same CSV form as the other sections. A missing lexicon prints a one-line note instead. The reader reads no other path.

**6. Writer (`write-lexicon.mjs`).** Same shape as `write-proposal.mjs`: validate the backlog name and that the backlog exists, parse the JSON list, apply every item in order to an in-memory lexicon with the pure functions, and only if all items pass, write a temp file beside the target and rename. Input keys are `term`, `definition`, `avoid`, `notes`, `partOf`; a patch is an item whose term exists, and only the keys present are changed. `partOf: ""` clears the parent; `avoid: []` clears the list. The file is created with the default headers when missing. The success message lists terms added and patched.

**7. Guard and skills.** `guard-bash.mjs` gets a fourth script in its pattern, allowed only with `--read-write` and only as `write-lexicon.mjs <file> <<'JSON'` with the same closing-line rule as `write-proposal.mjs`. `propose-stories/SKILL.md` and `/story:propose` add lexicon changes to the shown drafts and to the single yes/no, and write in this order: lexicon, proposals, review. If a later command is rejected, the earlier ones are not rerun (the existing rule). `explore-stories/SKILL.md` tells the model to use lexicon terms and to flag gaps, and that it can only discuss changes. The product-backlog guideline is not edited: terms belong to a backlog's data, not to the shared standards.

**8. Writes go straight to the file.** No staging area (decided with the user). A wrong definition is one edit in the tab, and the lexicon is now in the backups, so an unwanted skill write can be compared and recovered.

## Risks / Trade-offs

- [A skill write changes a definition that stories rely on] -> The skill shows old and new values and asks first; the writer never deletes a term and writes atomically; the lexicon is in every backup.
- [Excel opens the file, so a save fails with a locked error] -> The same retry and message as the other CSV files; the tab shows the wait.
- [A hand-edited lexicon has a row Excel mangled, such as a Part of that no longer names a term] -> Reported as a problem on that term only; it does not block unrelated saves, and unknown columns survive.
- [A term and an `Avoid` word that were both valid become a conflict after a later add] -> The rule is checked on the whole lexicon at every save and every writer run, so the add that creates the conflict is the one refused.
- [`useAutosave` was written for backlogs] -> The `serialize` option is the only change and defaults to today's behaviour.
- [Work already built for markdown] -> The rules, reducer, hook and tab are format-independent and stay; the markdown parser/composer, the `.md` file type in `validateName`/`server.cjs` and the file-name helper are replaced or removed in the same change.

## Migration Plan

Nothing to migrate: no lexicon file has been shared yet, and `data/lexicons/` is created on first save. A scratch `.md` lexicon made while testing is simply ignored by the CSV store. Rollback is deleting the tab and the folder; no existing file format changes.
