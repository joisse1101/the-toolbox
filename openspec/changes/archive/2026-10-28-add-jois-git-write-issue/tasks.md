# Tasks

## 1. Confirm the GitLab CLI contract

- [x] 1.1 Read `glab issue create --help` and the glab docs (or install `glab` if available) and record
  how it takes a description from a file or stdin and how it searches issues; verify by writing the
  exact flags into the command's notes before the command file is drafted

## 2. The command

- [x] 2.1 Create `toolkit/commands/jois-git/write-issue.md` with frontmatter (name, description,
  `disable-model-invocation: true`, `allowed-tools` limited to the remote read, `gh`/`glab` repo view,
  issue list and issue create, `metadata` version and date); verify `python check_toolkit.py` from
  `toolkit/` passes
- [x] 2.2 Write the steps: host detection, type choice, repo template lookup, gap questions, secret scan,
  duplicate search, presentation with confirmation word, body file, create and report; verify each
  `toolkit-write-issue` requirement maps to a step by reading the file against the spec
- [x] 2.3 Embed the bug, feature and task templates with their required and optional sections and the
  omit-when-empty rule; verify the section lists match the spec's lists exactly
- [x] 2.4 Dry-run the command on this GitHub repo up to the confirmation prompt for one issue of each
  type, without typing the word; verify no issue is created (`gh issue list` unchanged), optional
  sections with no content are absent, and the body shown matches the file written

## 3. Documentation

- [x] 3.1 Add `/jois-git:write-issue` to the `jois-git` commands in `toolkit/README.md`: what it does,
  the three types, `gh`/`glab` host detection, repo templates, and that `glab` is needed only for
  GitLab; verify the README example invocation matches the command's name
- [x] 3.2 Run `cd toolkit; python check_toolkit.py; python -m pytest` and `openspec validate
  add-jois-git-write-issue --strict`; verify both pass

## Workflow follow-up

- Archive the change after review so `toolkit-write-issue` becomes a main spec.
