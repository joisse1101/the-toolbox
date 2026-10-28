## Context

The earlier approach (change `patch-generated-opsx-commands`, dropped) generated the `/opsx:*` commands
and patched them with string anchors. OpenSpec 1.13.0 has two config scopes: a global `config.json`
(profile, delivery, workflows only) and a per-project `openspec/config.yaml` (`context`, per-artifact
`rules`, `operations.apply|archive.guidance`). The commit hard stops fit the second; the frontmatter
tweaks (hidden flag, archive `allowed-tools`) fit neither and are dropped.

## Goals / Non-Goals

**Goals:**
- One command sets a project up and can be re-run safely.
- The commit steps have one source: the global `jois-git-commit-hygiene` rule.
- The toolkit never edits a file `openspec` generates.

**Non-Goals:**
- Hiding the `/opsx:*` commands from the skill list, or pre-allowing git commands in archive.
- Installing OpenSpec or the commit rule. The command reports when either is missing.
- Teaching `Install-Toolkit.ps1` about OpenSpec.

## Decisions

- **The command is the only writer of `openspec/config.yaml`.** It can read the existing file and merge,
  and ask before each write; a PowerShell script would need a YAML parser. `Install-Toolkit.ps1` keeps
  copying files and nothing else.
- **The guidance text lives in the command file, once.** The config holds the installed copy. The
  block sits between `# jois-init:opsx begin` and `# jois-init:opsx end` comments inside each
  `guidance:` list, so a re-run replaces it in place and never doubles it. Anything outside the markers,
  including a project's own guidance, is left as is.
- **Guidance is one line per operation pointing at the rule.** Apply: follow `jois-git-commit-hygiene`
  at the end of each concern (explicit-path staging, summary, wait for the word). Archive: same for
  the archive commit. The rule is loaded in every session and carries the enforcement; config guidance
  is advisory and only prompts the agent to apply it.
- **Order inside the command:** check `openspec` is present and note its version; `init` if needed;
  global settings via `openspec config get/set`; config merge; rule check; `openspec update`; show
  what changed. No version pin: nothing here depends on generated wording.
- **Guidance is not hard enforcement.** If the stop does not hold in practice, revisit (a rule edit,
  or a tiny frontmatter patch) rather than guessing now.

## Risks / Trade-offs

- [Advisory guidance may be skipped by the agent] -> the global rule is the backstop; revisit if a real
  run shows otherwise.
- [A hand edit inside the markers is overwritten on re-run] -> say so in the block's comment.
- [YAML merge by an agent can mangle a file] -> show the diff and ask before writing; the file is in git.
- [`/opsx:*` commands clutter the skill list] -> accepted.
