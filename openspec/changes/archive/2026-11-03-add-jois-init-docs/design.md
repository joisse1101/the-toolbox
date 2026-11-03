# Design

## Context

- See proposal.md for motivation. Requirements are in `specs/toolkit-init-docs/spec.md`.
- **Source of the process.** Issue 39 attaches `HANDOFF.md` and the scripts from another project. They are flat (`wiki/*.md`, one level) and are the starting point, not the finished design.
- **Toolkit rules.** `toolkit/` is standalone and has its own checks (`check_toolkit.py`, pytest). Commands are single `.md` files or namespace folders. The installer copies skill and command folders recursively.
- **Closest model.** `toolkit/commands/jois-init/opsx.md`: asks per write, keeps managed text between `jois-init:opsx` markers, ends with a one-line report.
- **Where the command runs.** In a different project from this one, so every file it writes must come from the toolkit install.

## Goals / Non-Goals

**Goals:**
- One command that gives a repo the nested docs layout, the drift checker, the flattening publish and the PR line.
- A re-run that is safe: managed text replaced in place, project text untouched.
- Scripts that are plain Python standard library, so the target repo needs no install step beyond Python itself.

**Non-Goals:**
- Slice pages and staleness that depends on code changes (issue 73).
- Syncing wiki edits back to the repo. The wiki is warned about and overwritten.
- Non-markdown assets (images, files) under `docs/wiki/`.

## Decisions

### 1. Templates ship as a skill folder
- The templates live in `toolkit/skills/jois-init-docs-templates/` next to a short `SKILL.md` that says "templates for `/jois-init:docs`; not for direct use".
- The command reads them from `<project>/.claude/skills/` or `~/.claude/skills/`, whichever holds the folder.
- If neither does, it says so, names `Install-Toolkit.ps1` and stops, as `opsx` does for its rule.
- **Why.** The installer only moves skills, commands, rules and agents. A skill folder is copied whole, so the scripts, workflows and tests arrive as files and need no re-typing.
- **Alternatives.**
  - Embed the templates in `docs.md` as code blocks. The scripts and tests run to several hundred lines, so the command would become unreadable and hard to test.
  - A new `toolkit/templates/` folder. The installer would not copy it, so a project-scope install would lack it.

### 2. Command file and flow
- The file is `toolkit/commands/jois-init/docs.md`, named "JOIS: Init Docs", with `disable-model-invocation: true` and `allowed-tools` limited to `Read`, `Edit`, `Write` and a few `git` and `python` reads.
- Steps, in the order of the handoff's rollout: check the project; add the checker, builder and tests; add the `docs-check` workflow and PR line; add the `docs/wiki/` skeleton; add the publish workflow; offer `CLAUDE.md` routing and OpenSpec guidance; report.
- The checks come before the publish workflow, so a repo is never publishing pages that nothing guards.
- **Markers.** `# jois-init:docs begin` / `end` in YAML and Python, `<!-- jois-init:docs begin -->` / `end` in markdown. A whole-file template is wrapped in one pair.
- A file that exists without markers and differs from the template is shown as a diff and needs a yes.

### 3. Scripts live in `scripts/` in the target repo
- Files: `scripts/check_docs.py`, `scripts/build_wiki.py`, `scripts/tests/test_check_docs.py`, `scripts/tests/test_build_wiki.py`.
- The repo root is the parent of `scripts/`, with a `--root` override, as in the handoff.
- **Why.** The handoff put the checker in the project's own language folder. A generic installer cannot know that folder, and the handoff names `scripts/` as the fallback.
- **Alternative.** Ask the user for a folder. This adds a question for no gain; a rerun finds the files by marker.

### 4. Generated navigation is committed
- `build_wiki.py --write-nav` regenerates `docs/wiki/_Sidebar.md` and the page list inside `Home.md` between markers. The result is committed.
- The checker calls the same function and fails when its output differs from the committed files.
- **Why.** The handoff's orphan rule stays meaningful and checkable offline, and a reader browsing the repo sees the navigation.
- **Alternative.** Generate the sidebar only at publish time. The repo would then have no sidebar to check, so the orphan rule would be lost.

### 5. One tree walk, shared by the builder and the checker
- `check_docs.py` imports the page listing, link resolution and flat-name function from `build_wiki.py`.
- **Why.** The checker and the publish step must agree on what a page and a link are. Two copies would drift, which is the problem this process exists to prevent.

### 6. Flattening rules
- A page's flat name is its path under `docs/wiki/`, folders joined with `-`, without `.md`. `Home.md` and `_Sidebar.md` keep their names at the top.
- Authors write links as relative `.md` paths. The builder resolves each link against the page, maps it to the target's flat name and keeps any `#anchor`.
- Two pages with the same flat name make the builder fail, naming both. Example: `a-b.md` and `a/b.md`.
- A non-markdown file under `docs/wiki/` makes the checker fail with "not published". This is deliberate, so nothing silently goes missing from the wiki.
- **Alternative.** Publish assets too. Rejected for now: it needs link and path handling that no page uses yet.

### 7. Publish workflow
- Based on the handoff's `wiki-publish.yml`: trigger on `docs/wiki/**` on the default branch, clone `<repo>.wiki.git` with `GITHUB_TOKEN`, warn about foreign commits, mirror, push only when something changed, one concurrent run.
- The mirror step runs `build_wiki.py --out <dir>` and rsyncs that output with `--delete`. The handoff's `sed` for `.md` links is dropped, because the builder rewrites links.
- The wiki-edit warning is kept as is. It lists wiki commits not authored by the bot since its last publish, then publishes anyway.

### 8. Shipped tests run in the toolkit's own suite
- Tests sit beside the scripts in the template folder. The toolkit's pytest run collects them, so `cd toolkit; python -m pytest` covers the templates.
- Each test builds a minimal passing tree in `tmp_path` and breaks one thing, as in the handoff, with a page two folders deep.
- `check_toolkit.py` gains a check that every script under the template folder has a test file.

## Risks / Trade-offs

- [Wiki page titles come from flat names, so `architecture-billing-refunds` reads as "architecture billing refunds"] → Accept; keep names short and stable, and document that renaming a page changes its URL.
- [The publish workflow cannot be run end to end in this repo's tests] → Test the builder offline; the workflow's mirror step is only a call to it. State in the report that the first real publish is unchecked.
- [The repo needs the wiki enabled, a first page and write permission, none of which the command can set] → The command states all three and the delete-wiki-only-pages rule before it ends.
- [The inline-code path check can flag text that is not a path] → Keep the handoff's ignore marker; do not loosen the heuristic.
- [The handoff notes that a README in another project claimed the workflows ran when they did not] → The command's report lists the workflows as added only after it has read them back from disk.
- [Skill folder not installed] → The command stops with a clear message instead of writing partial output.

## Migration Plan

- This is new, additive and touches nothing existing apart from `toolkit/README.md` and `check_toolkit.py`.
- Rollback: delete the command, the template folder and the README text.
- Projects that ran an earlier hand-copied version of the process keep working. A first run of `/jois-init:docs` shows a diff for each of their files, because those files hold no markers.

## Open Questions

- Whether the command should also offer to run the builder once after adding the skeleton. This does not change the specs or the tasks, so it can be decided during apply.
