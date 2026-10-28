## 1. Rename the files

- [ ] 1.1 `git mv toolkit/skills/coding-standards toolkit/skills/jois-code-standards`, set its `name:` to `jois-code-standards`, and verify `git status` shows a rename and `name:` matches the folder
- [ ] 1.2 `git mv` the seven code rules to `jois-code-<name>.md` (`core-principles`, `architecture-boundaries`, `java`, `python`, `typescript-react`, `config-files`, `scripts`) and `commit-hygiene.md` to `jois-git-commit-hygiene.md`, and verify `ls toolkit/rules` lists exactly those eight new names
- [ ] 1.3 `git mv toolkit/commands/jois toolkit/commands/jois-git` and verify `ls toolkit/commands` shows `jois-git` and `opsx` only
- [ ] 1.4 Bump `metadata.version` (minor) and `last_updated` in every renamed skill, rule and command, and verify `python check_toolkit.py` reports no version problem for them

## 2. Update references

- [ ] 2.1 In the skill, rules and the `jois-git` commands, replace every old name (`/jois:`, `commit-hygiene`, `coding-standards`, the rule names) with the new one, and verify `grep -rnE "/jois:|coding-standards|commit-hygiene" toolkit/rules toolkit/skills toolkit/commands` finds only new-name matches
- [ ] 2.2 In `commands/opsx/apply.md` and `commands/opsx/archive.md`, change the references to the commit-hygiene rule to `jois-git-commit-hygiene` (the commands keep their names), and verify the grep from 2.1 finds no bare `commit-hygiene` there
- [ ] 2.3 In `install/Install-Toolkit.ps1` change the helper path to `skills\jois-code-standards\scripts\Get-ItemHash.ps1` and the examples to the new names, and verify `.\Install-Toolkit.ps1 -List` runs against a temp `-Scope project -Path` without error
- [ ] 2.4 In `check_toolkit.py` change the hardcoded skill and `commands/jois` paths to the new names, remove the dead `commands/jois-review` glob, and verify `python check_toolkit.py` passes
- [ ] 2.5 Update `tests/test_check_toolkit.py` to the new paths and verify `python -m pytest` passes (install pytest first if it is missing)
- [ ] 2.6 Update `toolkit/README.md`: the examples and the `jois` command section to the new names, a short section stating the `jois-<domain>-<thing>` pattern and the domains `git` and `code`, and the migration note from design.md; verify no old name remains with `grep -nE "/jois:|coding-standards|commit-hygiene" toolkit/README.md`
- [ ] 2.7 Check the repository's root `CLAUDE.md` and `README.md` for the old names (`jois`, `coding-standards`) outside `toolkit/`, update them, and verify the same grep finds none

## 3. Verify the rename end to end

- [ ] 3.1 Install into a temp project with `Install-Toolkit.ps1 -Scope project -Path <temp>` and verify the files land under the new names and `-List` shows every item `up to date`
- [ ] 3.2 Uninstall from the temp project with `-Uninstall` and verify the folder holds none of the toolkit's items afterwards
- [ ] 3.3 In a new Claude Code session on a machine with the old items removed and the toolkit reinstalled, verify `/jois-git:stage` runs and `jois-code-standards` appears in the skill listing

## 4. Specs and archive

- [ ] 4.1 Edit the Purpose line of `openspec/specs/jois-stage/spec.md` directly to name `/jois-git:stage` (a delta cannot change a Purpose), and verify `grep -n "/jois:" openspec/specs/jois-stage/spec.md` finds nothing
- [ ] 4.2 Run `openspec validate rename-toolkit-items --strict` and verify it reports the change valid, then archive the change
