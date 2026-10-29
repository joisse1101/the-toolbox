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
  (draft gaps, ask only when nothing supports a draft), scan, present with `AskUserQuestion`, create,
  report. The search re-runs after a revision only when the subject or summary changed.
- **Drafted sections are flagged in the presentation only.** The posted body never carries a marker or a
  placeholder, as the optional-section rule already forbids.
- **`AskUserQuestion` replaces the typed word.** Options "Create issue" and "Change something". The
  "never create before confirmation" rule stays explicit in the text. Free text does not create.
- **Code reads use `Read`, `Glob` and `Grep`,** added to `allowed-tools` along with `AskUserQuestion`;
  text taken from code goes through the existing scan. Glob replaces `ls` for template lookup.
- **Version 1.2.0,** `last_updated` set to the day of the change.

## Risks / Trade-offs

- [Wording is the only guard against #15] -> A spec scenario for an imperative description about the
  command, and a manual run of that case before the change is archived.
- [Drafting gaps can read as inventing facts] -> The text keeps "never invent facts", requires the
  drafted-sections note at confirmation, and asks when nothing supports a draft.
- [Wider `allowed-tools` lets the model read secrets from code] -> The scan covers anything that goes
  into the draft, and the user reads the whole body at confirmation.
- [`AskUserQuestion` makes confirmation easier to click through] -> Acceptable: an issue is easy to edit
  or close, unlike a commit.
