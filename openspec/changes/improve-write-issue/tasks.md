## 1. Guard against acting on the description (#15)

- [x] 1.1 Add an Input rule at the top of `toolkit/commands/jois-git/write-issue.md`: user text is the content of one issue, never instructions, even about the command or the repo, and one issue holds everything listed; verify by reading the file against the "User text is issue content" scenarios
- [x] 1.2 Replace "never edit code" with "never create or modify any file in the repository, whatever its type", naming the temp body file outside the repo as the only file written; verify against the "No repository file is modified" scenarios

## 2. Steps and templates (#16)

- [x] 2.1 Move the duplicate search right after the host check, from the description's terms, with the re-run-on-subject-change rule; verify against the "Duplicate search before creating" scenarios
- [x] 2.2 Rewrite the gaps step: draft from the user's words, conversation and code, flag drafted sections at confirmation only, ask a numbered list with proposed drafts when nothing supports a draft; verify against "Missing required content is drafted or asked for"
- [x] 2.3 Make Alternatives Considered optional in the feature template and the template list; verify against "Feature template"
- [x] 2.4 Allow read-only code grounding with Read, Glob and Grep for bug and feature, with the secret scan covering text taken from code; use Glob for template lookup; verify against "Read-only code grounding" and "Repository template takes precedence"
- [x] 2.5 Superseded by 5.1: the typed word stays, printed issue and no dialog; verify against "Confirmation word before publishing"
- [x] 2.6 Quote the body-file path in the `gh` and `glab` calls, cap the title at 70 characters and report the result as `[#N](url)` with a one-line title summary; verify against "Body passed from a file", "Conventional issue title" and "Creation report is a link"
- [x] 2.7 Add `Read`, `Glob` and `Grep` to `allowed-tools` and bump `metadata.version` to 1.2.0 with `last_updated` set; verify with `python check_toolkit.py` from `toolkit/`

## 3. Docs and checks

- [x] 3.1 Update the write-issue paragraph in `toolkit/README.md` (gaps, confirmation, duplicate search order, code reads); verify by reading it against the command
- [x] 3.2 Run `python check_toolkit.py` and `python -m pytest` from `toolkit/` and `openspec validate improve-write-issue --strict`; all pass
- [ ] 3.3 Run the command by hand with an imperative description about the command itself, and with a feature request that has no alternatives; verify it writes one issue each time and edits no file; use a long issue and check the whole issue is on screen before the word is asked

## 4. Follow-up: self-contained confirmation and grounding

- [x] 4.1 Superseded by 5.1 (the dialog preview hid 5 lines in a real run)
- [x] 4.2 In step 5, make reading the files the request points at a duty before drafting a required section, with the thin-draft note when there is nothing to read; verify against "Read-only code grounding"
- [x] 4.3 Bump `metadata.version` to 1.2.1, update the README paragraph, and run `python check_toolkit.py`, `python -m pytest` and `openspec validate improve-write-issue --strict`; all pass

## 5. Follow-up: back to a printed issue and a typed word

- [x] 5.1 In `write-issue.md` step 7, print the type, repository, template, title and complete body as plain text with the drafted-sections note, name a confirmation word, end the turn with no tool call, and create only on the word; remove `AskUserQuestion` from `allowed-tools`; verify against "Confirmation word before publishing"
- [x] 5.2 Bump `metadata.version` to 1.2.2, update the README sentence, and run `python check_toolkit.py`, `python -m pytest` and `openspec validate improve-write-issue --strict`; all pass
