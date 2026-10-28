## 1. The command

- [x] 1.1 Create `toolkit/commands/jois-init/opsx.md` with frontmatter (`name`, `description`, `allowed-tools` for `openspec`, `disable-model-invocation: true`, `metadata.version`, `metadata.last_updated`)
- [x] 1.2 Write its steps: check `openspec`; `init` when missing; global `delivery` and `workflows`; merge the marked guidance block into `openspec/config.yaml`; check the commit rule is installed; `openspec update`; show the diff; ask before each write
- [x] 1.3 Put the apply and archive guidance text in the command, each one line pointing at `jois-git-commit-hygiene`

## 2. Remove the patch approach

- [x] 2.1 Delete `toolkit/opsx/` (`Install-Opsx.ps1`, `patches.psd1`)
- [x] 2.2 Revert the `.gitignore` and `Install-Toolkit.ps1` lines that commit 30e7ca4 added for the generator
- [x] 2.3 Remove the stale comment in `toolkit/commands/jois-git/stage.md` that cites the generated `commands/opsx/apply.md`

## 3. Docs check and tests

- [x] 3.1 In `toolkit/check_toolkit.py`, drop every `opsx` special case; require version metadata under `jois-init/` as under `jois-git/`
- [x] 3.2 Update `toolkit/tests/test_check_toolkit.py`: remove the opsx-exempt cases, add a `jois-init` missing-version case
- [x] 3.3 Run `python check_toolkit.py` and `python -m pytest` from `toolkit/` and fix what they report

## 4. Docs

- [x] 4.1 Replace the `Install-Opsx.ps1` sections of `toolkit/README.md` with how to run `/jois-init:opsx`, what it writes, and what it accepts losing (hidden flag, archive permission prompts)
- [x] 4.2 Update the README note that the installed `/opsx:*` names are an exception to the `jois-` prefix
