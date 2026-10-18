## Context

See proposal.md - Why. State today:

- `core/story-text.js` splits a User Story on `/\bas a\b/i`, so "As an" fails; `composeStory` always writes `As a`. The portal holds only the role (`asA`), so a parser that merely accepted "an" would rewrite it as "As a approver" on the first portal save.
- `buildProposals` (`core/proposal-input.js`) is already pure; `writeProposal` validates, then `writeAtomic` (temp file + rename) and returns a message built from memory, not from the file.
- The file API's `PUT` (`server.cjs`) is a plain `writeFile` with no knowledge of what the client started from. The portal re-reads a file only when the tab becomes visible; `useProposals` re-saves whenever `state.edits > 0`, a counter that is never reset on load.
- Writers are only reachable through MCP tools that Claude Code asks about before each call. `read_context` cannot read `reviews/` or `lexicon-suggestions/` and does not say what it leaves out of `proposals`.
- The cause of the vanished proposals file is unknown. A write that returned success was an atomic rename, so the likeliest explanation is an overwrite afterwards, by the portal or another process.

## Goals / Non-Goals

**Goals:**
- A rejection for a fixable reason costs no confirmation (check before asking).
- A repeated write is safe, so recovery from a doubtful write is a plain retry.
- Every writer's result can be verified from disk in the same turn.
- The next overwrite can be traced to a writer.

**Non-Goals:**
- A conditional `PUT` (base version, 409) and any change to the portal's save trigger. They are only worth doing once the write log shows who overwrote the file; each would be its own change.
- Cross-checking `terms` against `items` in `check_drafts` (a story that uses a term defined in the same run is not validated against it, as today).
- Content comparison when a story is skipped as a repeat.

## Decisions

**1. The role includes its article.**
`STORY_KEYWORDS` splits on `As` (`/\bas\b/i`), `I want`, `so that`; `asA` is everything between the first two, so it reads "a team lead" or "an approver", and `composeStory` writes `As ${asA}, I want …`. No article field, no select: the story form shows one "As" input. The CSV format is unchanged (the cell is the sentence), so no migration, and review rows that replace `User Story` use the same parse/compose unchanged.
A role that is only an article ("As a , I want …") must still count as empty: `story-text.js` exports `roleIsBlank`, used by the writer, the review writer and `storyIssues`.
Alternatives: a separate `article` field with a select (built first, dropped: an extra control for something typed in one go); accept "an" and always compose "a" (the portal silently makes "As a approver"); choose by the role's first letter (wrong for "user", "hour"). Trade-off: "As approver" (no article) is now accepted, which is looser than before; the guidelines still show "As a".

**2. `check_drafts` is a separate read-only tool, built from the writers' validation.**
`writeProposal` is split into a prepare step (read files, parse input, `buildProposals`) and a write step; `checkProposal` is the prepare step plus a report. The lexicon and review writers get the same split if they do not already have one (their validation is pure in `core/`). A `dryRun` flag on the writers was rejected: the tool would still be a writer, so Claude Code would ask before it, which is the cost this removes. `check_drafts` is pre-approved in the launchers and listed in the skills' `allowed-tools`; the `--read-only` server (explore) does not expose it.

**3. Repeats are skipped in `buildProposals`, keyed on Epic + Feature + Title.**
The key is trimmed and case-folded. Matches against the stored proposals become `skipped: [{ position, id }]` and take no `NEW-<n>`; the `NEW-<k>` resolution maps `k` to the added ID or to the matched ID. Two equal keys inside one input are an error. Only the proposals file is searched, not the backlog: a proposal that mirrors a backlog story is a review question, not a retry. Alternative: a hash of the full content, rejected because a retry after the user edited a proposal in the portal would add a second copy.

**4. The writer verifies from disk.**
After the rename, the file is read and parsed with the portal's loader (`placeholderIds: true`); every added and patched ID must be present and the row count must equal the expected count. The message is built from what was read. This catches a write that did not stick; it cannot catch a later overwrite, which is what the skill's read-back (decision 7) is for. The same check applies to the other writers where it is cheap (lexicon: the terms; review: the row count).

**5. One shared write log.**
`core/write-log.cjs` appends `{time, writer, store, file, bytes, hash}` (hash: first 12 hex of SHA-256) to `data/logs/writes.jsonl`. It is called from the server's PUT/create/rename paths with writer `portal`, and from `writeAtomic` with the writer's name, so one file shows the order of writes from both. `logs` is not in `STORES`. A logging error goes to stderr and never fails the write. One appended line is small enough to be atomic for two processes. No rotation (YAGNI; a line per write).

**6. `read_context` gets the three missing views.**
`proposals` states the benched count it leaves out. `reviews` returns counts per story, or with `storyIds` the open rows of those stories (a 324-row file stays readable). `lexicon-suggestions` returns open rows in full. `storyIds` is a new parameter allowed only with `reviews`; the existing "at most one of `section`, `storyId`" rule is unchanged. Both the CLI reader and the MCP tool get them, since the tool wraps the reader's function.

**7. The skills read back and recover.**
`propose-stories` (and `/story:propose`) call `check_drafts` before the yes/no, and after each write call `read_context` for that file in the same turn and compare. A mismatch is reported and only the missing part is sent again; with decision 3 a repeated proposals call is safe. The sentence "run each call once" becomes the recovery rule. The skill also states the `As a` / `As an` rule up front, since the tool description does too.

## Risks / Trade-offs

- [Two stories that legitimately share Epic, Feature and Title] → the second is skipped and reported with the ID it matched; the user renames one or the skill sends a patch.
- [Read-back proves the file is right now, not later] → the write log shows later writers; if it points at the portal, the conditional-PUT change follows.
- [A role with no article is accepted] → the guidelines and the skill keep showing "As a"; a stricter check can be added if it ever matters.
- [`check_drafts` on `terms` and `items` separately can pass and then fail at write time] → the writers still validate; the skill's existing rule to fix only the rejected part applies.
- [Log file in `data/` grows] → one short line per write; revisit if it ever matters.

## Migration Plan

No data migration: the stored sentence is unchanged and old files parse as before. Rollback is reverting the code; `data/logs/` can be deleted at any time.

## Open Questions

- Whether the lexicon and review writers already expose a pure validate step is checked at the start of the work (task 1.1); if one needs a larger refactor, `check_drafts` ships for `items` first and the other inputs follow in a later change.
