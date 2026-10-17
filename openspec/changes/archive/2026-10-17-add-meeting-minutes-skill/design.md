## Context

Skills here write to `data/` only through a script with a fixed target (`write-proposal.mjs`, `write-lexicon.mjs`): `.claude/settings.json` denies `Read` and `Edit` on `./data/**`. Those scripts export a pure function plus a small `isMain` CLI wrapper, and use `writeAtomic` (temp file, then rename). Minutes are markdown for a person to read, not CSV, so the CSV file API and `validateName` (which forces `.csv`) do not apply.

## Goals / Non-Goals

**Goals:**
- A skill that is one `SKILL.md` + `template.md` + one writer, no launcher, no guard.
- Safe by construction: fixed folder, no overwrite by default, no path from the caller.

**Non-Goals:**
- Showing or editing minutes in the portal, listing past meetings, a CSV store.
- Parsing speakers or dates in code: the model does that from the notes; the script only names and writes.

## Decisions

- **Writer takes title + date, builds the name itself.** The caller never supplies a path, so no traversal is possible. Slug: lowercase, non-alphanumerics collapsed to `-`, trimmed; an empty slug is refused. The date is validated by building a `Date` and comparing back, so `2026-02-30` fails.
- **Collision suffix `_1`, `_2`, ...** placed after the date (`<slug>_<date>_<n>.md`), chosen over overwriting because minutes are a record. The next free `n` is found by checking existence; creation uses the `wx` flag so two runs cannot take the same name.
- **Refinement via `--replace <file name>`**, not a guess. The writer cannot know whether notes are "the same meeting", and the skill cannot list `data/` (denied), so the user's words decide and the file is named explicitly: the one the writer printed earlier in the session, or one the user names. The name must match `^[a-z0-9]+(-[a-z0-9]+)*_\d{4}-\d{2}-\d{2}(_\d+)?\.md$` and exist; this rejects separators and `..` without a path check of its own. The replace goes through `writeAtomic`.
- **Pure function + CLI wrapper**, like the other writers, so tests call `writeMinutes({ dataDir, title, date, text, replace })` against a temp folder. The folder is `path.join(dataDir, 'meetings')`, with `DATA_DIR` from `core/paths.cjs` as the default.
- **Template as a file.** `template.md` holds the format, so the user can edit the layout without touching logic; `SKILL.md` says to follow it and cites it rather than restating it.
- **Asking for gaps** uses `AskUserQuestion` for short choices and plain text for names, since most answers are free text. All gaps are collected in one round before the minutes are shown.

## Risks / Trade-offs

- A wrong guess at "is this a refinement" would replace a file → replace only on the user's explicit statement, always by an explicit file name, and say which file was replaced.
- Relative dates resolved wrongly ("next Friday") → shown in the minutes before saving, so the user sees them.
- Minutes contain names and decisions → they stay in git-ignored `data/` and are never reachable through the file API.
- `settings.json` may prompt for the writer command each time → decide at apply time whether to add an allow rule for exactly this command.
