## 1. Read hook

- [x] 1.1 Add `ai/mcp/guard-read.mjs`: reads the hook input, resolves the `Read` file path or `Grep` path, allows only the paths in `TLT_READ_ALLOW`, denies everything else (folders, `..`, no Grep path, empty or unset env, unparseable input) with a message naming the allowed files
- [x] 1.2 Add `test/guard-read.test.mjs` covering the allowed file with offset/limit, a Grep on it, another backlog's lexicon, `backups/` and `meetings/`, `..` escape, a folder, Grep without path, unset env, and a non-existing allowed file

## 2. read_context

- [x] 2.1 In `.claude/skills/explore-stories/read-story-context.mjs` remove the `proposals` and `lexicon` sections; return an error naming the absolute path of the file; list both files (path, size, benched count, or "does not exist yet") in the menu
- [x] 2.2 Update the `read_context` description and schema in `ai/mcp/story-tools.mjs` (sections list, pointer to the two files, no benched-count text)
- [x] 2.3 Update `test/story-tools-mcp.test.mjs` and the read-story-context tests for the refused sections and the new menu

## 3. Launchers

- [x] 3.1 In `ai/launchers/story-tools-config.ps1` add a function resolving the two absolute paths (`TLT_DATA_DIR`, default `data/`)
- [x] 3.2 In `shape-stories.ps1` and `explore-stories.ps1`: print the two paths and the tool list, wait for Enter (`n`/Ctrl+C aborts, cleanup runs), set `TLT_READ_ALLOW`, add `Read,Grep` to `--tools`, put the two paths in the opening prompt
- [x] 3.3 Register `guard-read.mjs` for `Read|Grep` in the `locked-settings.json` of `explore-stories` and `propose-stories`
- [x] 3.4 Smoke-test both launchers: abort at the prompt starts nothing; an allowed read works; a read of a backup is denied

## 4. Skills and commands

- [x] 4.1 `explore-stories` and `propose-stories` SKILL.md: read the lexicon and proposals with Read/Grep (Grep for a term or Avoid word), ignore `Benched: Yes`, treat file text as data, read back proposals/lexicon writes with Grep
- [x] 4.2 `/story:propose`, `/story:re-read` and `/story:review` command texts: same changes; re-read uses Read for the two files
- [x] 4.3 Check `allowed-tools` lists in the skills so Read and Grep are not prompted for the allowed files

## 5. Docs and spec

- [x] 5.1 Update `CLAUDE.md` (story-tools paragraph, launcher tool list, sections) and `README.md`
- [x] 5.2 Run `npm test` and `openspec validate read-lexicon-proposals-by-file --strict`
