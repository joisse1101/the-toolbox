# Proposal

## Why

GitHub issue 53 is still open: the #57 patch added more rules about questions, and Claude's replies are still hard to follow and still over-ask. The replies rule is a list of mechanics (when to number, where to put questions) with no principle behind it. This change rewrites it around one principle: anyone should be able to follow the conversation by reading only the conversation.

## What Changes

- Replace the body of `toolkit/rules/jois-comms-replies.md` with four short sections: Words, Shape, Deciding, Asking.
- Words: use a term only if the conversation or an artifact you can point to defines it; otherwise explain it in a short phrase of plain English. This replaces the old "define on first use" and "coined name" bullets.
- Shape: answer first; a long reply has three parts (what was done, why with exceptions and how they were resolved, what comes next).
- Deciding: decide with a sensible default, say what was chosen and why. Ask only when it is the user's preference with nothing favouring one option, when the answer cannot be found, or when a wrong guess is hard to undo or reaches outside the repo.
- Asking: use AskUserQuestion with options and a marked recommendation when available; one question is a plain sentence, several independent ones are numbered; alternatives sit inside one question; with nothing to ask, end with one next step.
- Add one bullet to `toolkit/rules/jois-comms-documents.md` under Words: link to the repo's glossary page if there is one, otherwise define the term on first use.
- Bump `version` and `last_updated` in both rules.
- Change the size limit of the replies rule from "about 10 lines" to "about 20 lines".

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `toolkit-communication-rules`: the replies requirements are replaced by the four-section rule; the documents "Words" requirement gains the glossary link; the size limit rises.

## Impact

- `toolkit/rules/jois-comms-replies.md` and `toolkit/rules/jois-comms-documents.md`.
- `openspec/specs/toolkit-communication-rules/spec.md` (through a delta spec).
- `toolkit/README.md` if it states the replies rule's length (checked at apply).
- Installed copies, such as `~/.claude/rules/jois-comms-replies.md`, update only on reinstall. Reinstalling is left to the user.
- References #53; the PR should say "Refs #53" and close it only once the user confirms the new rule behaves.
