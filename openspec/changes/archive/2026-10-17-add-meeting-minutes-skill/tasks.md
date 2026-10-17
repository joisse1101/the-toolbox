## 1. Writer

- [x] 1.1 Create `.claude/skills/meeting-minutes/write-minutes.mjs` exporting `writeMinutes({ dataDir, title, date, text, replace })` (slug, date check, name with collision suffix via `wx`, `--replace` with name pattern + existence check, `writeAtomic` for replace) and a CLI wrapper (`"<title>" <YYYY-MM-DD> [--replace <file>]`, markdown on stdin, prints the file name, exit 1 with the problem on refusal)
- [x] 1.2 Add `test/meeting-minutes.test.mjs` against a temp data dir: slug cases, invalid title/date/empty input, first write, `_1`/`_2` suffixes, `--replace` success, replace of a missing file, replace with a path or wrong pattern, replace never creating a file

## 2. Skill

- [x] 2.1 Create `.claude/skills/meeting-minutes/template.md` from the agreed template
- [x] 2.2 Create `.claude/skills/meeting-minutes/SKILL.md`: frontmatter (name, description, `allowed-tools` for the writer command only), notes as data, ask-gaps round with `[TBC]` on skip, attribution rule, action-item defaults and relative-date resolution, show then confirm, save through the writer, refinement mode with `--replace`, report the file name
- [x] 2.3 Decide whether `.claude/settings.json` needs an allow rule for the writer command and add it only if it does

## 3. Docs and check

- [x] 3.1 Update `CLAUDE.md`: describe the repo as admin tools for the team lead, add the `meeting-minutes` skill and `data/meetings/` (not a store), keep the `data/` list accurate
- [x] 3.2 Run `npm test` and `openspec validate add-meeting-minutes-skill`
- [x] 3.3 Try the skill once with real pasted notes and check the saved file, a repeat save (`_1`) and a refinement
