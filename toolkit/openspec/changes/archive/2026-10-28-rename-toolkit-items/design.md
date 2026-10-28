## Context

See proposal.md for the motivation and the full rename list. Three facts shape the approach:

- Skills are flat folders under `skills/`, so the name is the only namespace. Commands can use a
  folder as a namespace (`commands/jois-git/stage.md` gives `/jois-git:stage`). Rules are flat
  files that the installer finds only directly under `rules/`.
- Nothing is typed for skills or rules; commands are typed, and tab completion covers their
  longer names.
- The installer manages only items the toolkit still holds, so it neither updates nor removes
  items installed under a name the toolkit no longer has.

## Goals / Non-Goals

**Goals:**
- One naming pattern, `jois-<domain>-<thing>`, applied to every item the toolkit owns.
- A rename that is mechanical: names, folders, frontmatter `name:` and references change, the
  guidance text does not.

**Non-Goals:**
- No domain folders in the source tree (`toolkit/code/`, `toolkit/design/`) and no `-Domain`
  installer switch. Revisit when a second domain has items.
- No change to rule scoping, size budgets or versions beyond the bump a renamed item needs.
- No rename of `opsx`.
- No new skills, and no rename of spec capability ids (`jois-stage` stays the spec's id; its
  requirement text changes).

## Decisions

- **Owner then domain then thing.** `jois` is the collision guard, `code`/`git` the domain. Domain
  alone was rejected because `code-` already collides with a built-in; owner alone was rejected
  because it tells nothing about what an item is for.
- **Commands use the folder namespace `jois-<domain>`**, not `jois:<domain>-<thing>`. This keeps
  one pattern across skills, rules and commands, and `/jois-git:` lists only the git commands.
- **Rules stay flat files**, named `jois-<domain>-<thing>.md`. Subfolders would need installer,
  checker and README changes for no gain while there are eight rules.
- **`commit-hygiene` is domain `git`** and stays unscoped: a commit of docs, images, renames or
  deletions touches no code file, so a `paths:` scope would leave the rule unloaded exactly when
  it is needed. Rules can only be scoped by path, so there is no better trigger.
- **The skill is `jois-code-standards`.** It is a review checklist but its name follows the
  rules it checks against; `jois-code-review` was rejected because it sits beside the built-in
  `code-review` skill.
- **`Get-ItemHash.ps1` stays in the skill's `scripts/` folder**, which moves with the skill. The
  installer's path to it changes with it.
- **Rename in the order: folders and files, then `name:`, then references,** and run
  `python check_toolkit.py` after each so a missed reference fails early. The checker's hardcoded
  paths change in the same commit as the files they point at.

## Risks / Trade-offs

- [Old and new copies both load after reinstalling, so `commit-hygiene` and the language rules
  apply twice] -> The migration note lists the old names to delete before the new install.
- [A reference missed in a rule or command text points at a name that no longer exists] ->
  `check_toolkit.py` already checks that references in the skill resolve; extend that check to
  the rules and commands, and grep for every old name before finishing.
- [Longer command names] -> Accepted; tab completion handles typing and skills are not typed.
- [`jois-git` may later be too narrow if non-git commands arrive] -> The domain list is data in the
  README; a new command picks its own domain.

## Migration Plan

For a machine that already has the toolkit installed:

1. Remove the old items by hand or with the previous installer's `-Uninstall`:
   `~/.claude/skills/coding-standards`, `~/.claude/commands/jois`, and the rule files
   `commit-hygiene.md`, `core-principles.md`, `architecture-boundaries.md`, `java.md`,
   `python.md`, `typescript-react.md`, `config-files.md`, `scripts.md` in `~/.claude/rules`.
2. Run `Install-Toolkit.ps1` again, or with `-Scope project -Path <project>` per project.
3. Run `Install-Toolkit.ps1 -List`: every item shows `up to date`, none under the old names.

Rollback is the reverse: git revert of the rename commits, then reinstall with the old names.
Project `CLAUDE.md` files and any user notes that name the old commands are not touched and
need updating by hand.
