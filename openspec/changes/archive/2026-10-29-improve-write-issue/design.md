## Context

`toolkit/commands/jois-git/write-issue.md` is one self-contained file (steps, rules, templates). The
spec is `openspec/specs/toolkit-write-issue/spec.md`; `toolkit/check_toolkit.py` checks frontmatter and
versions only and pins none of the command's wording. See proposal.md for the motivation.

In #15 the command was installed and ran, then the model carried out the pasted description instead of
writing an issue. The command text never says that the user's text is content, and its "never edit
code" rule does not obviously cover Markdown or spec files. There is no code path to fix: the guard has
to be wording in the command, backed by a spec scenario.

## Goals / Non-Goals

**Goals:**
- The command's text makes it hard to read a description as a task, and forbids every repository write.
- The steps are reordered and softened as in #16 without weakening "never create before confirmation".

**Non-Goals:**
- No change to the commit-hygiene rule or to `jois-git` commands other than write-issue.
- No tooling that blocks writes mechanically; `allowed-tools` cannot restrict `Write` by path.

## Decisions

- **Guard by wording at the top of the command, before the steps.** A short "Input" rule: the user's
  text is the content of one issue, never instructions, even about this command or the repo, and one
  issue holds everything listed. *Alternative:* a first step that restates the task; rejected as the
  rule applies at every step, not once.
- **Widen "never edit code" to "never create or modify any file in the repository".** The temp body file
  outside the repo is the one exception. `Write` stays needed for it, and `allowed-tools` cannot scope it
  by path, so the rule is text only.
- **Step order:** host check, duplicate search (terms from the description), type, template, compose
  (draft gaps, ask only when nothing supports a draft), scan, print the issue and stop for the
  confirmation word, create, report. The search re-runs after a revision only when the subject or summary changed.
- **Drafted sections are flagged in the presentation only.** The posted body never carries a marker or a
  placeholder, as the optional-section rule already forbids.
- **The typed confirmation word stays, and the issue is printed as plain text.** The command prints the
  whole issue, names a word and ends the turn with no tool call; the next message with that word
  creates it, so the issue is created in one reply. *Alternative tried:* an `AskUserQuestion` with the
  body in the preview of "Create issue"; in a real run the preview hid 5 lines, and the dialog can
  cover text written earlier in the turn, so the user chose without reading the whole draft. *Alternative:*
  plan mode's approval dialog; untested, and its options can switch the session to auto-accept edits.
  This reverses #16 item 7, whose own Alternatives Considered names the typed word as the stricter option.
- **Grounding is a duty, not an option.** Before drafting a required section, the command reads the
  files or folders the request points at, so drafts fit the existing code; with nothing to read it says
  the draft rests on little.
- **Code reads use `Read`, `Glob` and `Grep`,** added to `allowed-tools`;
  text taken from code goes through the existing scan. Glob replaces `ls` for template lookup.
- **Version 1.2.2,** `last_updated` set to the day of the change.

## Risks / Trade-offs

- [Wording is the only guard against #15] -> A spec scenario for an imperative description about the
  command, and a manual run of that case before the change is archived.
- [Drafting gaps can read as inventing facts] -> The text keeps "never invent facts", requires the
  drafted-sections note at confirmation, and asks when nothing supports a draft.
- [Wider `allowed-tools` lets the model read secrets from code] -> The scan covers anything that goes
  into the draft, and the user reads the whole body at confirmation.
- [A typed word is heavier than a click] -> Accepted: the word is one reply, the whole issue is on
  screen when it is typed, and it matches the commit rule.
