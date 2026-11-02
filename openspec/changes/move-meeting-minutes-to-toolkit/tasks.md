# Tasks

## 1. Version check covers `jois-docs`

- [x] 1.1 Add `commands/jois-docs/*.md` to `_versioned_items` in `toolkit/check_toolkit.py`, and to the check 3 line in its docstring, then verify `python check_toolkit.py` still passes (result: python check_toolkit.py -> "toolkit check passed", exit 0)
- [x] 1.2 Add a test in `toolkit/tests/test_check_toolkit.py` that a `jois-docs` command without `metadata.version` is reported, modelled on the existing version tests, and verify `python -m pytest` passes (result: python -m pytest -q -> 34 passed in 1.05s)

## 2. The `jois-docs` command

- [x] 2.1 Create `toolkit/commands/jois-docs/meeting-minutes.md` with `disable-model-invocation: true`, `allowed-tools: Read, Glob, Write`, `metadata` version and date, the inline template, and the rules from the `toolkit-meeting-minutes` spec; verify `python check_toolkit.py` passes (result: python check_toolkit.py -> "toolkit check passed", exit 0)
- [x] 2.2 Document the command in `toolkit/README.md`: add a `docs` row to the Naming table, a `jois-docs` commands section (input, save location, refinement), and `-Command jois-docs` as the install line; verify the README names the command exactly as the file does (result: grep of README -> `/jois-docs:meeting-minutes` found once, matches commands/jois-docs/meeting-minutes.md; python check_toolkit.py -> "toolkit check passed", exit 0 (run before the README edit, not repeated after it))
- [x] 2.3 Run `.\Install-Toolkit.ps1 -Scope project -Path <temp folder> -Command jois-docs` into a temp folder, then `-List`, and verify the command is listed as installed with its version (result: Install-Toolkit.ps1 -Scope project -Path <temp> -Command jois-docs -> "installed command jois-docs", file landed at .claude/commands/jois-docs/meeting-minutes.md; -List -> "jois-docs up to date 1.0.0 (2026-10-30)")

## 3. Remove the planner's meeting minutes

- [x] 3.1 Delete `.claude/skills/meeting-minutes/`, `planner/claude/launchers/meeting-minutes.ps1`, `planner/test/claude/meeting-minutes.test.mjs` and `planner/test/claude/guard-minutes-bash.test.mjs`; verify `git grep -il "meeting-minutes\|write-minutes\|guard-minutes"` outside `openspec/` finds nothing (result: git grep -il "meeting-minutes|write-minutes|guard-minutes" outside openspec/ -> only toolkit/README.md, the new /jois-docs:meeting-minutes entry; skill, launcher and the two tests absent)
- [x] 3.2 Remove the `meeting-minutes` skill paragraph, the `meetings/` data folder entry and the intro mention from `CLAUDE.md`, and the `meetings` entry from `README.md`; verify `git grep -i "meetings\|minutes" CLAUDE.md README.md` finds only the pointer to the toolkit, if you keep one (result: git grep -in "meetings|minutes" CLAUDE.md README.md -> no matches)
- [x] 3.3 Run `npm test` in `planner/` and verify it passes, since the zones test and the removed tests may have referenced the skill (result: npm test in planner/ -> 750 tests, 750 pass, 0 fail on the second run; the first run failed once in backlog-tools-ready.test.mjs:45 "not ready after the tool list was sent" and was not investigated)

## 4. Final checks

- [ ] 4.1 Run `python check_toolkit.py` and `python -m pytest` in `toolkit/` and `npm test` in `planner/`, and verify all three pass
- [ ] 4.2 Run `openspec validate move-meeting-minutes-to-toolkit --strict` and verify it passes

## Workflow follow-up

- Commit each group as its own concern, with your confirmation word for each commit.
- `/opsx:archive` merges the specs: `toolkit-meeting-minutes` is added, `toolkit-skills` is updated, and `meeting-minutes-skill` loses all its requirements.
- Existing files in `planner/data/meetings/` are left in place for you to move by hand.
